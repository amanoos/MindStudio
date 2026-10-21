// Checks that every source URL in content/words actually loads.
// Run: npm run content:links   (needs network; not part of the offline content lint)
import { join } from 'node:path'
import { loadWordFiles } from '../src/lib/server/content.js'

const entries = await loadWordFiles(join(process.cwd(), 'content', 'words'))

/** @type {Map<string, string[]>} */
const urls = new Map()
for (const { word } of entries) {
  const all = [...word.etymology.sources, ...(word.historicalSources ?? []), ...word.sources]
  for (const s of all) urls.set(s.url, [...(urls.get(s.url) ?? []), word.headword])
}

/** @param {string} url */
async function check(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; MindStudioLinkCheck/1.0)' }
      })
      return res.status
    } catch {
      /* retry once, then report as unreachable */
    }
  }
  return 0
}

const queue = [...urls.keys()]
/** @type {{ url: string, status: number }[]} */
const bad = []
let blocked = 0
let done = 0

async function worker() {
  for (let url = queue.shift(); url; url = queue.shift()) {
    const status = await check(url)
    // Some sites refuse automated requests; that says nothing about whether the page exists.
    if (status === 403 || status === 429) blocked++
    else if (status < 200 || status >= 300) bad.push({ url, status })
    done++
  }
}
await Promise.all(Array.from({ length: 6 }, worker))

console.log(`Checked ${done} unique URLs (${done - bad.length - blocked} loaded).`)
if (blocked)
  console.log(`${blocked} blocked automated requests (403/429) and could not be verified.`)
if (bad.length) {
  console.error(`${bad.length} did not return 2xx:`)
  for (const b of bad)
    console.error(`  ${b.status || 'unreachable'}  ${b.url}  (${urls.get(b.url)?.join(', ')})`)
  process.exit(1)
}
console.log('All source links load.')
