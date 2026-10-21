import { json } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'

export async function GET() {
  try {
    await getDb().execute('SELECT 1')
    return json({ ok: true })
  } catch {
    return json({ ok: false }, { status: 503 })
  }
}
