import { createCookieSessionStorage, redirect } from 'react-router'

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set')
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    secrets: [sessionSecret],
    maxAge: 60 * 60 * 24 * 30,
  },
})

export const { getSession, commitSession, destroySession } = sessionStorage

export async function getUserLogin(request: Request): Promise<string | null> {
  const session = await getSession(request.headers.get('Cookie'))
  const login = session.get('userLogin')
  return typeof login === 'string' ? login : null
}

export async function requireUser(request: Request): Promise<string> {
  const login = await getUserLogin(request)
  if (!login) {
    const url = new URL(request.url)
    const returnTo = url.pathname + url.search
    throw redirect(`/auth/github?returnTo=${encodeURIComponent(returnTo)}`)
  }
  return login
}

export function getAllowedUsers(): Set<string> {
  const raw = process.env.ALLOWED_GITHUB_USERS ?? ''
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}
