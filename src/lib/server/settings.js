import { timezone as defaultTimezone } from './config.js'

export const SESSION_LENGTHS = [5, 10, 15, 20]
const DEFAULT_SESSION_LENGTH = 10

/** @param {string} tz */
export function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** All IANA timezones the runtime knows, with UTC first. */
export function listTimezones() {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return ['UTC', ...zones.filter((z) => z !== 'UTC')]
}

/** @param {import('@libsql/client').Client} db */
async function readAll(db) {
  const res = await db.execute('SELECT key, value FROM setting')
  return new Map(res.rows.map((r) => [String(r.key), String(r.value)]))
}

/**
 * The learner's settings, falling back to the environment default for the timezone.
 * @param {import('@libsql/client').Client} db
 */
export async function getSettings(db) {
  const all = await readAll(db)
  const savedTz = all.get('timezone')
  const length = Number(all.get('session_length'))
  return {
    timezone: savedTz && isValidTimezone(savedTz) ? savedTz : defaultTimezone(),
    sessionLength: SESSION_LENGTHS.includes(length) ? length : DEFAULT_SESSION_LENGTH
  }
}

/**
 * Which timezone defines "today". Changing it only affects future dates; history is stored as
 * plain local dates and is never rewritten.
 * @param {import('@libsql/client').Client} db
 */
export async function getTimezone(db) {
  return (await getSettings(db)).timezone
}

/**
 * @param {import('@libsql/client').Client} db
 * @param {{ timezone: string, sessionLength: number }} input
 * @returns {Promise<void>}
 */
export async function saveSettings(db, { timezone, sessionLength }) {
  if (!isValidTimezone(timezone)) throw new Error('Unknown timezone')
  if (!SESSION_LENGTHS.includes(sessionLength)) throw new Error('Unsupported session length')
  await db.batch(
    [
      {
        sql: `INSERT INTO setting (key, value) VALUES ('timezone', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [timezone]
      },
      {
        sql: `INSERT INTO setting (key, value) VALUES ('session_length', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [String(sessionLength)]
      }
    ],
    'write'
  )
}
