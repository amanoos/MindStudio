import { fail } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { getAdminOverview, setIssueResolved } from '#lib/server/admin.js'

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  return { overview: await getAdminOverview(getDb()) }
}

/** @type {import('./$types').Actions} */
export const actions = {
  resolve: async ({ request }) => {
    const form = await request.formData()
    const id = Number(form.get('id'))
    if (!Number.isInteger(id)) return fail(400, { error: 'Unknown report.' })
    await setIssueResolved(getDb(), id, form.get('resolved') === '1')
    return { ok: true }
  }
}
