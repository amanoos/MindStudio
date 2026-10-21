import { redirect } from '@sveltejs/kit'
import { getDb } from '#lib/server/db.js'
import { bootstrap } from '#lib/server/seed.js'
import { authConfig, verifySession } from '#lib/server/auth.js'

const PUBLIC_PATHS = ['/login', '/healthz']

/** Runs once at startup: migrate, lint content, seed. Refuses to start on bad content. */
export async function init() {
  authConfig() // fail fast in production if secrets are missing
  const { inserted, updated, skipped } = await bootstrap(getDb())
  console.log(
    skipped
      ? '[boot] content unchanged, seed skipped'
      : `[boot] content ready: ${inserted} new, ${updated} refreshed`
  )
}

/** @type {import('@sveltejs/kit/hooks').Handle} */
export async function handle({ event, resolve }) {
  const path = event.url.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
  if (!isPublic) {
    const { sessionSecret } = authConfig()
    if (!verifySession(sessionSecret, event.cookies.get('session'))) redirect(303, '/login')
  }
  const response = await resolve(event)
  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('referrer-policy', 'same-origin')
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  return response
}
