// Production entry point (used by the Dockerfile). A thin wrapper around the SvelteKit
// adapter-node request handler.
//
// Why it exists: adapter-node works out the app's own address from proxy headers and assumes
// https when no protocol header is present. That makes SvelteKit's cross-site form check reject
// logins on plain-http local Docker (http://localhost:...). Setting ASSUME_HTTP=1 declares that
// requests arrive over plain http. Leave it unset behind an HTTPS proxy such as Render, which
// already sends x-forwarded-proto.
import http from 'node:http'
import { handler } from './build/handler.js'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '0.0.0.0'
const assumeHttp = process.env.ASSUME_HTTP === '1'

const server = http.createServer((req, res) => {
  if (assumeHttp && !req.headers['x-forwarded-proto']) req.headers['x-forwarded-proto'] = 'http'
  handler(req, res, () => {
    res.statusCode = 404
    res.end('Not found')
  })
})

server.listen(port, host, () => console.log(`Listening on http://${host}:${port}`))

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
  })
}
