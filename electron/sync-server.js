import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { loadReminderState, saveReminderState } from './store.js'

const defaultPort = 4288

export function startSyncServer({
  distDir,
  buildInfo = createBuildInfo(distDir),
  onStateChanged = () => {},
  port = defaultPort,
  publicDir,
  syncKey,
}) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost')

    if (requestUrl.pathname.startsWith('/api/') && !isAuthorized(request, requestUrl, syncKey)) {
      sendJson(response, { error: 'Unauthorized sync request.' }, 401)
      return
    }

    if (requestUrl.pathname === '/api/version' && request.method === 'GET') {
      sendJson(response, buildInfo)
      return
    }

    if (requestUrl.pathname === '/api/state' && request.method === 'GET') {
      sendJson(response, loadReminderState())
      return
    }

    if (requestUrl.pathname === '/api/state' && (request.method === 'POST' || request.method === 'PUT')) {
      readJsonBody(request)
        .then((state) => {
          const savedState = saveReminderState(state)
          onStateChanged(savedState)
          sendJson(response, savedState)
        })
        .catch(() => {
          sendJson(response, { error: 'Invalid reminder state.' }, 400)
        })
      return
    }

    serveStaticApp(request, response, distDir, publicDir)
  })

  server.listen(port, '0.0.0.0')

  return {
    getInfo() {
      return {
        localUrl: withSyncKey(`http://127.0.0.1:${port}`, syncKey),
        networkUrls: getNetworkUrls(port).map((url) => withSyncKey(url, syncKey)),
        port,
        running: server.listening,
      }
    },
    server,
  }
}

function createBuildInfo(distDir) {
  const packagePath = path.join(distDir, '..', 'package.json')
  const indexPath = path.join(distDir, 'index.html')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  const indexStats = statSync(indexPath)

  return {
    buildId: `${packageJson.version}-${Math.floor(indexStats.mtimeMs)}`,
    builtAt: indexStats.mtime.toISOString(),
    version: packageJson.version,
  }
}

function isAuthorized(request, requestUrl, syncKey) {
  if (!syncKey) {
    return false
  }

  const providedKey = requestUrl.searchParams.get('key') ?? request.headers['x-sync-key']
  return providedKey === syncKey
}

function withSyncKey(url, syncKey) {
  return `${url}/?key=${encodeURIComponent(syncKey)}`
}

function serveStaticApp(request, response, distDir, publicDir) {
  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1)
  const distPath = path.join(distDir, relativePath)
  const publicPath = path.join(publicDir, relativePath)
  const filePath = existsSync(distPath) ? distPath : existsSync(publicPath) ? publicPath : path.join(distDir, 'index.html')

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': getContentType(filePath),
  })

  createReadStream(filePath).pipe(response)
}

function sendJson(response, data, statusCode = 200) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(data))
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk

      if (body.length > 1024 * 1024) {
        request.destroy()
        reject(new Error('Body too large'))
      }
    })

    request.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', reject)
  })
}

function getNetworkUrls(port) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((networkInterface) => {
      return networkInterface && networkInterface.family === 'IPv4' && !networkInterface.internal
    })
    .map((networkInterface) => `http://${networkInterface.address}:${port}`)
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  }

  return contentTypes[extension] ?? 'application/octet-stream'
}
