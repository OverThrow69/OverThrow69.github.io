import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const outputDir = path.join(root, 'public-release', 'morries-reminder-site')
const siteUrl = getSiteUrl()

if (!existsSync(distDir)) {
  throw new Error('Missing dist folder. Run npm run build first.')
}

rmSync(outputDir, { force: true, recursive: true })
mkdirSync(outputDir, { recursive: true })
cpSync(distDir, outputDir, { recursive: true })

const indexPath = path.join(outputDir, 'index.html')
const indexHtml = readFileSync(indexPath, 'utf8')
writeFileSync(indexPath, enhanceIndexHtml(indexHtml, siteUrl))
writeFileSync(path.join(outputDir, '404.html'), readFileSync(indexPath, 'utf8'))
writeFileSync(path.join(outputDir, 'robots.txt'), createRobotsTxt(siteUrl))

if (siteUrl) {
  writeFileSync(path.join(outputDir, 'sitemap.xml'), createSitemapXml(siteUrl))
}

writeFileSync(path.join(outputDir, 'PUBLISH-CHECKLIST.txt'), createChecklist(siteUrl))

console.log(`Public web release: ${outputDir}`)
console.log(siteUrl ? `Configured public URL: ${siteUrl}` : 'No public URL configured yet.')

function getSiteUrl() {
  const urlArg = process.argv.find((arg) => arg.startsWith('--url='))
  const rawUrl = urlArg ? urlArg.slice('--url='.length) : process.env.PUBLIC_SITE_URL ?? ''
  const trimmedUrl = rawUrl.trim()

  if (!trimmedUrl) {
    return ''
  }

  const withProtocol = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`
  const parsedUrl = new URL(withProtocol)
  parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '')
  parsedUrl.search = ''
  parsedUrl.hash = ''

  return parsedUrl.toString().replace(/\/$/, '')
}

function enhanceIndexHtml(html, publicUrl) {
  if (!publicUrl) {
    return html
  }

  const tags = [
    `<link rel="canonical" href="${publicUrl}/" />`,
    `<meta property="og:url" content="${publicUrl}/" />`,
    `<meta name="twitter:url" content="${publicUrl}/" />`,
  ]

  return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`)
}

function createRobotsTxt(publicUrl) {
  const lines = ['User-agent: *', 'Allow: /']

  if (publicUrl) {
    lines.push(`Sitemap: ${publicUrl}/sitemap.xml`)
  }

  return `${lines.join('\n')}\n`
}

function createSitemapXml(publicUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${publicUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
}

function createChecklist(publicUrl) {
  return `Morries Reminder public release checklist

1. Upload every file in this folder to a public HTTPS host.
2. The homepage must return HTTP 200 at ${publicUrl || 'your public URL'}.
3. Google must be able to open /robots.txt.
4. If PUBLIC_SITE_URL was not set, rerun:
   npm run release:web -- --url=https://your-domain.example
5. Add the public URL in Google Search Console.
6. Use URL Inspection > Request indexing for the homepage.
7. Search later with:
   site:${publicUrl || 'your-domain.example'} Morries Reminder
`
}
