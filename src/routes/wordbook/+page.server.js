import { getDb } from '#lib/server/db.js'
import { listFeaturedTopics, searchWordbook } from '#lib/server/wordbook.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
  const p = url.searchParams
  const from = p.get('from') ?? ''
  const to = p.get('to') ?? ''
  const filters = {
    q: (p.get('q') ?? '').slice(0, 100),
    topic: p.get('topic') ?? '',
    state: p.get('state') ?? '',
    favorites: p.get('favorites') === '1',
    tag: (p.get('tag') ?? '').slice(0, 30),
    from: DATE.test(from) ? from : '',
    to: DATE.test(to) ? to : '',
    sort: p.get('sort') ?? 'newest'
  }

  const db = getDb()
  const [words, topics, everything] = await Promise.all([
    searchWordbook(db, filters),
    listFeaturedTopics(db),
    searchWordbook(db)
  ])

  return { filters, words, topics, total: everything.length }
}
