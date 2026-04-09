import { createClient as createWebClient } from '@libsql/client/web'
import { createClient as createLocalClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { dbCredentials } from '~/config/.server/db'
import { isProd } from '~/config/env'
import * as schema from './schema'

let client = isProd
  ? createWebClient(dbCredentials)
  : createLocalClient(dbCredentials)

export const db = drizzle(client, { schema })
