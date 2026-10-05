const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

if (process.platform === 'win32' && app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox')
}

function writeStartupLog(message, error) {
  try {
    const logPath = path.join(app.getPath('userData'), 'startup.log')
    const detail = error ? `\n${error.stack || error.message || String(error)}` : ''
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}${detail}\n`)
  } catch {
    // Startup logging must never become the reason startup fails.
  }
}

writeStartupLog('bootstrap start', `isPackaged=${app.isPackaged}`)

process.on('uncaughtException', (error) => {
  writeStartupLog('uncaughtException', error)
})

process.on('unhandledRejection', (error) => {
  writeStartupLog('unhandledRejection', error)
})

import('./main.js').catch((error) => {
  writeStartupLog('failed to import main.js', error)
  app.quit()
})
