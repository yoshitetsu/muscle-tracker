import { redirect } from 'react-router'
import {
  commitSession,
  getAllowedUsers,
  getSession,
} from '~/.server/session'

export async function loader({ request }: { request: Request }) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET must be set',
    )
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const session = await getSession(request.headers.get('Cookie'))
  const expectedState = session.get('oauthState')
  const returnToRaw = session.get('oauthReturnTo')
  const returnTo =
    typeof returnToRaw === 'string' && returnToRaw.startsWith('/')
      ? returnToRaw
      : '/'

  if (!code || !state || !expectedState || state !== expectedState) {
    return new Response('Invalid OAuth callback', { status: 400 })
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })
  if (!tokenRes.ok) {
    return new Response('Token exchange failed', { status: 502 })
  }
  const tokenData = (await tokenRes.json()) as {
    access_token?: string
    error?: string
  }
  if (!tokenData.access_token) {
    return new Response('No access token returned', { status: 502 })
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'muscle-tracker',
    },
  })
  if (!userRes.ok) {
    return new Response('User fetch failed', { status: 502 })
  }
  const user = (await userRes.json()) as { login?: string }
  if (!user.login) {
    return new Response('No login returned', { status: 502 })
  }

  const allowed = getAllowedUsers()
  if (!allowed.has(user.login)) {
    return new Response('Forbidden', { status: 403 })
  }

  session.unset('oauthState')
  session.unset('oauthReturnTo')
  session.set('userLogin', user.login)

  return redirect(returnTo, {
    headers: { 'Set-Cookie': await commitSession(session) },
  })
}
