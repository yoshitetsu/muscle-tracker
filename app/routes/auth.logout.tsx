import { redirect } from 'react-router'
import { destroySession, getSession } from '~/.server/session'

export async function action({ request }: { request: Request }) {
  const session = await getSession(request.headers.get('Cookie'))
  return redirect('/', {
    headers: { 'Set-Cookie': await destroySession(session) },
  })
}

export function loader() {
  return redirect('/')
}
