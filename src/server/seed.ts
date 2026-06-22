import { randomUUID } from 'node:crypto'
import { db } from '#/db'
import {
  bookingItems,
  bookings,
  doctorTreatments,
  loyaltyTransactions,
  medicalRecords,
  notifications,
  transactions,
  treatments as treatmentsTbl,
} from '#/db/schema'
import { account, session, user, verification } from '#/db/auth-schema'
import { treatments as treatmentData, weeklyPromos } from '#/data/clinic'
import { patients, bookings as ownerBookings, medicalRecords as recs, ownerUser } from '#/data/owner'
import { currentUser, pointHistory, notifications as notifData } from '#/data/account'
import { auth } from '#/lib/auth'

// Shared demo password for every seeded account (email + password auth).
export const DEMO_PASSWORD = 'ameris123'

const emailFor = (id: string, name: string) =>
  id === 'p1'
    ? currentUser.email
    : name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/(^\.|\.$)/g, '') + '@email.com'

const staggered = (i: number) => new Date(Date.now() - i * 3 * 86_400_000)

export async function seedDatabase() {
  // FK-safe wipe
  await db.delete(notifications)
  await db.delete(doctorTreatments)
  await db.delete(loyaltyTransactions)
  await db.delete(medicalRecords)
  await db.delete(transactions)
  await db.delete(bookingItems)
  await db.delete(bookings)
  await db.delete(treatmentsTbl)
  await db.delete(session)
  await db.delete(account)
  await db.delete(verification)
  await db.delete(user)

  // ── Users (owner + patients) ──
  await db.insert(user).values({
    id: 'owner-meriana',
    name: ownerUser.name,
    email: 'owner@ameris.local',
    emailVerified: true,
    role: 'owner',
    phone: '0811-0000-0001',
    birthDate: '1985-03-15',
    loyaltyPoints: 0,
    createdAt: new Date('2026-01-29'),
  })

  await db.insert(user).values(
    patients.map((p) => ({
      id: p.id,
      name: p.name,
      email: emailFor(p.id, p.name),
      emailVerified: true,
      role: 'pasien',
      phone: p.phone,
      birthDate: p.birthDate,
      loyaltyPoints: p.points,
      createdAt: new Date(p.joined),
    })),
  )

  // ── Doctors (role 'dokter') ──
  const doctors = [
    { id: 'dr-anya', name: 'dr. Anya Paramita', email: 'anya@ameris.local', phone: '0811-0000-0002', birthDate: '1990-07-12', cats: ['Facial', 'Peeling', 'Skinbooster'], pct: 35 },
    { id: 'dr-rendra', name: 'dr. Rendra Wijaya', email: 'rendra@ameris.local', phone: '0811-0000-0003', birthDate: '1986-02-20', cats: ['Laser', 'Injeksi', 'Paket'], pct: 40 },
  ]
  await db.insert(user).values(
    doctors.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      emailVerified: true,
      role: 'dokter',
      phone: d.phone,
      birthDate: d.birthDate,
      loyaltyPoints: 0,
      createdAt: new Date('2026-02-01'),
    })),
  )

  // ── Credential passwords (email + password auth) ──
  // One Better-Auth-hashed password row per user; everyone shares DEMO_PASSWORD.
  const ctx = await auth.$context
  const passwordHash = await ctx.password.hash(DEMO_PASSWORD)
  const allUserIds = ['owner-meriana', ...patients.map((p) => p.id), ...doctors.map((d) => d.id)]
  await db.insert(account).values(
    allUserIds.map((uid) => ({
      id: randomUUID(),
      accountId: uid,
      providerId: 'credential',
      userId: uid,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  )

  // ── Treatments ──
  const promoByName = new Map(weeklyPromos.map((p) => [p.name, p]))
  // Redeem ladder: point cost ≈ treatment value (Rp500rb ≈ 1 poin), capped 1–20.
  // Flag one real catalog treatment per distinct point level → a clean 1–20
  // ladder of genuinely bookable treatments (the privilege/landing both read this).
  const pointOf = (price: number) => Math.min(20, Math.max(1, Math.round(price / 500_000)))
  const redeemableIds = new Set<string>()
  const perLevel = new Map<number, number>()
  for (const t of [...treatmentData].sort((a, b) => a.price - b.price)) {
    const level = pointOf(t.price)
    const count = perLevel.get(level) ?? 0
    if (count < 2) {
      // up to 2 treatments per point level → a full, varied 1–20 ladder
      perLevel.set(level, count + 1)
      redeemableIds.add(t.id)
    }
  }
  await db.insert(treatmentsTbl).values(
    treatmentData.map((t) => {
      const promo = promoByName.get(t.name)
      // For a promo item the regular price IS the promo's "was"; the discounted
      // price goes to promoNow. This keeps the model consistent: price = regular
      // (the struck-through "was"), promoNow = what the customer pays.
      const price = promo ? promo.was : t.price
      return {
        id: t.id,
        name: t.name,
        blurb: t.blurb,
        category: t.category,
        duration: t.duration,
        price,
        pricePerUnit: !!t.pricePerUnit,
        isAvailable: t.available,
        isPromo: !!promo,
        isBestSeller: !!t.bestSeller,
        pointCost: redeemableIds.has(t.id) ? pointOf(price) : null,
        promoWas: promo?.was ?? null,
        promoNow: promo?.now ?? null,
      }
    }),
  )

  // ── Doctor treatment shares (which treatments each doctor does + share %) ──
  const dtRows = doctors.flatMap((d) =>
    treatmentData
      .filter((t) => d.cats.includes(t.category))
      .slice(0, 8)
      .map((t, i) => ({
        id: randomUUID(),
        doctorId: d.id,
        treatmentId: t.id,
        sharePct: Math.min(100, d.pct + (i % 3) * 5), // small spread; owner can tune
      })),
  )
  if (dtRows.length) await db.insert(doctorTreatments).values(dtRows)

  // ── Bookings + items + transactions ──
  for (const b of ownerBookings) {
    await db.insert(bookings).values({
      id: b.id,
      userId: b.patientId,
      bookingDate: b.date,
      bookingTime: b.time,
      status: b.status,
      total: b.total,
      createdAt: new Date(b.date + 'T00:00:00'),
    })
    await db.insert(bookingItems).values(
      b.items.map((it) => ({
        id: randomUUID(),
        bookingId: b.id,
        treatmentId: null,
        nameAtBooking: it.name,
        priceAtBooking: it.price,
        qty: 1,
      })),
    )
    const online = b.payment !== 'Klinik'
    const paid = b.payStatus === 'Lunas'
    await db.insert(transactions).values({
      id: randomUUID(),
      bookingId: b.id,
      amount: b.total,
      paymentMethod: online ? 'Online' : 'Offline',
      paymentStatus: b.payStatus,
      paymentPlan: 'full',
      // Realistic Midtrans data so every transaction looks settled via the gateway.
      midtransOrderId: online ? `${b.id}-seed` : null,
      midtransStatus: online ? (paid ? 'settlement' : 'pending') : null,
      paidAt: online && paid ? new Date(b.date + 'T00:00:00') : null,
      createdAt: new Date(b.date + 'T00:00:00'),
    })
  }

  // ── Extra completed bookings attributed to doctors (powers earnings view) ──
  // Each uses a real treatmentId from the doctor's assigned set, across 3 months,
  // paid online via Midtrans (settlement) so doctor share + transactions populate.
  const earnDates = ['2026-04-09', '2026-05-14', '2026-06-12']
  const earnPatients = ['p2', 'p4', 'p6', 'p7']
  let earnN = 0
  const earnBookings: (typeof bookings.$inferInsert)[] = []
  const earnItems: (typeof bookingItems.$inferInsert)[] = []
  const earnTxns: (typeof transactions.$inferInsert)[] = []
  for (const d of doctors) {
    const picks = treatmentData.filter((t) => d.cats.includes(t.category)).slice(0, 2)
    for (const t of picks) {
      for (const date of earnDates) {
        const id = 'AMR-D' + (101 + earnN)
        const at = new Date(date + 'T00:00:00')
        earnBookings.push({ id, userId: earnPatients[earnN % earnPatients.length], bookingDate: date, bookingTime: '11:00', status: 'Selesai', total: t.price, createdAt: at })
        earnItems.push({ id: randomUUID(), bookingId: id, treatmentId: t.id, nameAtBooking: t.name, priceAtBooking: t.price, qty: 1 })
        earnTxns.push({ id: randomUUID(), bookingId: id, amount: t.price, paymentMethod: 'Online', paymentStatus: 'Lunas', paymentPlan: 'full', midtransOrderId: `${id}-seed`, midtransStatus: 'settlement', paidAt: at, createdAt: at })
        earnN++
      }
    }
  }
  if (earnBookings.length) {
    await db.insert(bookings).values(earnBookings)
    await db.insert(bookingItems).values(earnItems)
    await db.insert(transactions).values(earnTxns)
  }

  // ── Medical records ──
  await db.insert(medicalRecords).values(
    recs.map((m) => ({
      id: m.id,
      userId: m.patientId,
      bookingId: m.bookingId === '—' ? null : m.bookingId,
      treatment: m.treatment,
      skin: m.skin,
      notes: m.notes,
      createdAt: new Date(m.date + 'T00:00:00'),
    })),
  )

  // ── Loyalty ledger (Sarah / p1) ──
  await db.insert(loyaltyTransactions).values(
    pointHistory.map((h, i) => ({
      id: randomUUID(),
      userId: 'p1',
      label: h.label,
      delta: h.delta,
      createdAt: staggered(i),
    })),
  )

  // ── Notifications (Sarah / p1) ──
  await db.insert(notifications).values(
    notifData.map((n, i) => ({
      id: randomUUID(),
      userId: 'p1',
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: !n.unread,
      createdAt: staggered(i),
    })),
  )

  return {
    users: patients.length + 1 + doctors.length,
    doctors: doctors.length,
    treatments: treatmentData.length,
    bookings: ownerBookings.length + earnBookings.length,
    transactions: ownerBookings.length + earnBookings.length,
    records: recs.length,
    password: DEMO_PASSWORD,
  }
}
