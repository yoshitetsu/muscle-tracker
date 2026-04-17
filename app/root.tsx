import {
  Form,
  Links,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router'
import { requireUser } from '~/.server/session'
import './tailwind.css'

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/auth/')) {
    return { userLogin: null }
  }
  const userLogin = await requireUser(request)
  return { userLogin }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="cupcake">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>腹筋トラッカー 💪</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const data = useLoaderData<typeof loader>()
  const userLogin = data?.userLogin

  return (
    <>
      {userLogin && (
        <header className="fixed right-0 top-0 z-50 p-3">
          <Form method="post" action="/auth/logout">
            <button type="submit" className="btn btn-ghost btn-sm">
              @{userLogin} · ログアウト
            </button>
          </Form>
        </header>
      )}
      <Outlet />
    </>
  )
}
