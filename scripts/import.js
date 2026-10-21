// Command-line restore: npm run import -- --in backup.json
// Replaces current progress with the backup. Run `npm run db:seed` first on a brand-new database.
import { readFile } from 'node:fs/promises'
import { getDb } from '../src/lib/server/db.js'
import { importBackup, validateBackup } from '../src/lib/server/export.js'

const args = process.argv.slice(2)
const flag = args.indexOf('--in')
const file = flag >= 0 ? args[flag + 1] : undefined
if (!file) {
  console.error('Usage: npm run import -- --in backup.json')
  process.exit(1)
}

const backup = JSON.parse(await readFile(file, 'utf8'))
const problems = validateBackup(backup)
if (problems.length) {
  console.error(`Not a usable backup: ${problems.join(' ')}`)
  process.exit(1)
}

const result = await importBackup(getDb(), backup)
console.log(
  `Restored ${result.words} words, ${result.reviews} reviews, ${result.notes} notes.` +
    (result.skippedUnknown ? ` Skipped ${result.skippedUnknown} entries for unknown words.` : '')
)
