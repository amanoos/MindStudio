// Command-line backup: npm run export -- --out backup.json
import { writeFile } from 'node:fs/promises'
import { getDb } from '../src/lib/server/db.js'
import { buildBackup } from '../src/lib/server/export.js'

const args = process.argv.slice(2)
const flag = args.indexOf('--out')
const out =
  flag >= 0 ? args[flag + 1] : `mind-studio-backup-${new Date().toISOString().slice(0, 10)}.json`
if (!out) {
  console.error('Usage: npm run export -- --out backup.json')
  process.exit(1)
}

const backup = await buildBackup(getDb())
await writeFile(out, JSON.stringify(backup, null, 2))
console.log(
  `Wrote ${out}: ${backup.ledger.length} words, ${backup.reviewAttempts.length} reviews, ${backup.notes.length} notes.`
)
