import { fail, redirect } from '@sveltejs/kit'
import { authConfig, createRateLimiter, safeEqual, signSession } from '#lib/server/auth.js'

const limiter = createRateLimiter()

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request, cookies, url, getClientAddress }) => {
    const who = getClientAddress()
    if (limiter.isLimited(who))
      return fail(429, { error: 'Too many tries. Please wait a few minutes and try again.' })

    const form = await request.formData()
    const attempt = String(form.get('passcode') ?? '')
    const { passcode, sessionSecret } = authConfig()

    if (!safeEqual(attempt, passcode)) {
      limiter.recordFailure(who)
      return fail(400, { error: 'That passcode did not match. Give it another go.' })
    }

    limiter.reset(who)
    cookies.set('session', signSession(sessionSecret), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 30
    })
    redirect(303, '/')
  }
}
