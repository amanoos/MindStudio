import { join } from 'node:path'
import { loadBlocklist, loadWordFiles, lintWords } from '../src/lib/server/content.js'
import { lintActivities, loadActivityFiles } from '../src/lib/server/activity-content.js'

const root = process.cwd()
const blocklist = await loadBlocklist(join(root, 'content', 'blocklist.txt'))
const words = await loadWordFiles(join(root, 'content', 'words'))
const activities = await loadActivityFiles(join(root, 'content', 'activities'))
const errors = [...lintWords(words, blocklist), ...lintActivities(activities, blocklist)]

if (errors.length) {
  console.error(`Content lint failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`Content lint passed: ${words.length} words, ${activities.length} activities.`)
