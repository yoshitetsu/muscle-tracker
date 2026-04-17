import { nanoid } from 'nanoid'
import { redirect } from 'react-router'
import { commitSession, getSession } from '~/.server/session'

export async function loader({ request }: { request: Request }) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  if (!clientId) {
    throw new Error('GITHUB_OAUTH_CLIENT_ID must be set')
  }

  const url = new URL(request.url)
  const returnTo = url.searchParams.get('returnTo') ?? '/'
  const state = nanoid(32)

  const session = await getSession(request.headers.get('Cookie'))
  session.set('oauthState', state)
  session.set('oauthReturnTo', returnTo)

  const redirectUri = new URL('/auth/github/callback', url.origin).toString()
  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('scope', 'read:user')
  authorize.searchParams.set('allow_signup', 'false')

  return redirect(authorize.toString(), {
    headers: { 'Set-Cookie': await commitSession(session) },
  })
}
