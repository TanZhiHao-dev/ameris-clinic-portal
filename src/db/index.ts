// Swappable Drizzle client: PGlite (embedded Postgres, file-backed) for local
// dev; real Postgres (Neon/Supabase) when DATABASE_URL is set. Same API both ways.
import * as domain from './schema'
import * as auth from './auth-schema'

import type { PgliteDatabase } from 'drizzle-orm/pglite'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export const schema = { ...domain, ...auth }
export type Schema = typeof schema

export type DB =
  | PgliteDatabase<Schema>
  | PostgresJsDatabase<Schema>

const DATABASE_URL = process.env.DATABASE_URL
const PGLITE_DATA_DIR = process.env.PGLITE_DATA_DIR ?? './.data/ameris'

const migrationsFolder = './drizzle'

async function createDb(): Promise<DB> {
  if (DATABASE_URL) {
    const { drizzle } = await import('drizzle-orm/postgres-js')
    const postgres = (await import('postgres')).default
    const client = postgres(DATABASE_URL, { max: 10, prepare: false })
    const database = drizzle(client, { schema })
    const { migrate } = await import('drizzle-orm/postgres-js/migrator')
    await migrate(database as never, { migrationsFolder })
    return database
  }
  const { drizzle } = await import('drizzle-orm/pglite')
  const { PGlite } = await import('@electric-sql/pglite')
  // PGlite's mkdir is non-recursive — ensure the parent dir exists first.
  const fs = await import('node:fs')
  const path = await import('node:path')
  fs.mkdirSync(path.dirname(path.resolve(PGLITE_DATA_DIR)), { recursive: true })
  const client = new PGlite(PGLITE_DATA_DIR)
  const database = drizzle(client, { schema })
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  await migrate(database as never, { migrationsFolder })
  return database
}

// Singleton, HMR-safe.
const g = globalThis as unknown as { __ameris_db?: Promise<DB> }
const dbPromise: Promise<DB> = (g.__ameris_db ??= createDb())

export const db: DB = await dbPromise
