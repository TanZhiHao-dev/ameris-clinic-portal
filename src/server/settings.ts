import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { appSettings } from '#/db/schema'
import { clinic } from '#/data/clinic'
import { requireOwner } from './_session'

const QRIS_KEY = 'payment.qris_image'

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)
  return row?.value ?? null
}

async function setSetting(key: string, value: string | null) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } })
}

// Public: bank details (static) + the owner-uploaded QRIS image (DB) shown on
// the checkout transfer instructions.
export const getPaymentInfo = createServerFn({ method: 'GET' }).handler(async () => {
  const qrisImage = await getSetting(QRIS_KEY)
  return {
    bankName: clinic.bank.bankName,
    accountNumber: clinic.bank.accountNumber,
    accountHolder: clinic.bank.accountHolder,
    qrisImage, // data-URL, or null when not set
  }
})

// Owner: set or clear the QRIS image (stored as a data-URL).
export const ownerSetQris = createServerFn({ method: 'POST' })
  .validator(z.object({ image: z.string().max(3_000_000).nullable() }))
  .handler(async ({ data }) => {
    await requireOwner()
    await setSetting(QRIS_KEY, data.image && data.image.trim() ? data.image : null)
    return { ok: true }
  })
