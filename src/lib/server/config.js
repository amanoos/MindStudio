/**
 * The learner's IANA timezone, which decides what "today" means.
 * Comes from DEFAULT_TIMEZONE until the Settings page (T17) stores a choice in the database.
 */
export function timezone() {
  const tz = process.env.DEFAULT_TIMEZONE || 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return 'UTC'
  }
}
