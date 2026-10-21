// Measures the JavaScript and CSS the Today page really loads, gzipped, and compares it with the
// budget. Run after a build:  npm run build && npm run check:bundle
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_JS_KB = 120
const PORT = 4299
const base = `http://127.0.0.1:${PORT}`
const dbFile = join(tmpdir(), `mind-studio-bundle-${Date.now()}.db`).replaceAll('\\', '/')

const server = spawn(process.execPath, ['server.js'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(PORT),
    ASSUME_HTTP: '1',
    PROTOCOL_HEADER: 'x-forwarded-proto',
    APP_PASSCODE: 'bundle-check',
    SESSION_SECRET: 'bundle-check-secret-0123456789abc',
    DATABASE_URL: `file:${dbFile}`
  },
  stdio: 'ignore'
})

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/healthz`)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('The server did not start')
}

/** @param {string} path */
const gzipKb = async (path) => gzipSync(await readFile(join('build', 'client', path))).length / 1024

let failed = false
try {
  await waitForServer()
  const login = await fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'passcode=bundle-check'
  })
  const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
  const html = await (await fetch(`${base}/`, { headers: { cookie } })).text()

  const assets = [...new Set(html.match(/\/_app\/immutable\/[^"')\s]+\.(?:js|css)/g) ?? [])]
  let js = 0
  let css = 0
  for (const a of assets) {
    const kb = await gzipKb(a)
    if (a.endsWith('.js')) js += kb
    else css += kb
  }
  const fonts = [...new Set(html.match(/\/_app\/immutable\/assets\/[^"')\s]+\.woff2/g) ?? [])]

  console.log(`Today page, gzipped: ${js.toFixed(1)} KB of JavaScript, ${css.toFixed(1)} KB of CSS`)
  console.log(
    `(${assets.filter((a) => a.endsWith('.js')).length} script files; ${fonts.length} font files named in the page)`
  )
  if (js > BUDGET_JS_KB) {
    console.error(`Over budget: ${js.toFixed(1)} KB > ${BUDGET_JS_KB} KB`)
    failed = true
  } else console.log(`Within the ${BUDGET_JS_KB} KB JavaScript budget.`)
} finally {
  server.kill()
}
process.exit(failed ? 1 : 0)
