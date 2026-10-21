import { error } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { buildBackup, buildWordbookRows, toCsv } from '#lib/server/export.js'

/** Downloads, only for the signed-in learner (the request hook guards every route). */
const FILES = {
  'backup.json': { type: 'application/json; charset=utf-8', label: 'backup' },
  'wordbook.json': { type: 'application/json; charset=utf-8', label: 'wordbook' },
  'wordbook.csv': { type: 'text/csv; charset=utf-8', label: 'wordbook' }
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
  const file = /** @type {keyof typeof FILES | undefined} */ (
    Object.keys(FILES).find((f) => f === params.file)
  )
  if (!file) error(404, 'Unknown export')

  const db = getDb()
  let body
  if (file === 'backup.json') body = JSON.stringify(await buildBackup(db), null, 2)
  else if (file === 'wordbook.json') body = JSON.stringify(await buildWordbookRows(db), null, 2)
  else body = toCsv(await buildWordbookRows(db))

  const stamp = new Date().toISOString().slice(0, 10)
  const ext = file.split('.')[1]
  return new Response(body, {
    headers: {
      'content-type': FILES[file].type,
      'content-disposition': `attachment; filename="mind-studio-${FILES[file].label}-${stamp}.${ext}"`,
      'cache-control': 'no-store'
    }
  })
}
