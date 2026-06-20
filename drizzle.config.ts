import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  ...(url
    ? { dbCredentials: { url } }
    : {
        driver: 'pglite',
        dbCredentials: { url: process.env.PGLITE_DATA_DIR ?? './.data/ameris' },
      }),
  verbose: true,
  strict: true,
})
