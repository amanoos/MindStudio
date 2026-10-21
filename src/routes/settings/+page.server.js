import { fail, redirect } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { importBackup, validateBackup } from '#lib/server/export.js'
import { getSettings, listTimezones, saveSettings, SESSION_LENGTHS } from '#lib/server/settings.js'

const MAX_BACKUP_BYTES = 10 * 1024 * 1024

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  return {
    settings: await getSettings(getDb()),
    timezones: listTimezones(),
    sessionLengths: SESSION_LENGTHS
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  save: async ({ request }) => {
    const form = await request.formData()
    try {
      await saveSettings(getDb(), {
        timezone: String(form.get('timezone') ?? ''),
        sessionLength: Number(form.get('sessionLength'))
      })
    } catch (err) {
      return fail(400, { saveError: err instanceof Error ? err.message : 'Could not save.' })
    }
    return { saved: true }
  },

  restore: async ({ request }) => {
    const form = await request.formData()
    const file = form.get('backup')
    if (form.get('confirm') !== 'yes')
      return fail(400, { restoreError: 'Please tick the box to confirm the replacement.' })
    if (!(file instanceof File) || file.size === 0)
      return fail(400, { restoreError: 'Choose a backup file first.' })
    if (file.size > MAX_BACKUP_BYTES)
      return fail(400, { restoreError: 'That file is larger than 10 MB, so it is not a backup.' })

    let backup
    try {
      backup = JSON.parse(await file.text())
    } catch {
      return fail(400, { restoreError: 'That file is not valid JSON.' })
    }
    const problems = validateBackup(backup)
    if (problems.length) return fail(400, { restoreError: problems.join(' ') })

    try {
      const result = await importBackup(getDb(), backup)
      return { restored: result }
    } catch {
      // The restore is all-or-nothing, so a failure here leaves current progress unchanged.
      return fail(500, {
        restoreError: 'The restore failed and nothing was changed. Is the file damaged?'
      })
    }
  },

  logout: async ({ cookies }) => {
    cookies.delete('session', { path: '/' })
    redirect(303, '/login')
  }
}
