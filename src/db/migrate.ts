import { db } from './index'

const migrationsFolder = './drizzle'

// Idempotent: creates __drizzle_migrations and applies only unrun migrations.
// Safe to call on every server boot.
export async function runMigrations(): Promise<void> {
  if (process.env.DATABASE_URL) {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator')
    await migrate(db as never, { migrationsFolder })
  } else {
    const { migrate } = await import('drizzle-orm/pglite/migrator')
    await migrate(db as never, { migrationsFolder })
  }
}
