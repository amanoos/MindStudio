import { join } from 'node:path'
import { loadBlocklist, loadWordFiles, lintWords } from '../src/lib/server/content.js'

const root = process.cwd()
const entries = await loadWordFiles(join(root, 'content', 'words'))
const errors = lintWords(entries, await loadBlocklist(join(root, 'content', 'blocklist.txt')))

if (errors.length) {
  console.error(`Content lint failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`Content lint passed: ${entries.length} words.`)
