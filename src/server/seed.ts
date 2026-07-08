import { randomUUID } from 'node:crypto'
import { db } from '#/db'
import {
  assists,
  beauticians as beauticiansTbl,
  bookingItems,
  bookings,
  closings,
  doctorTreatments,
  inventoryItems,
  inventoryMovements,
  loyaltyTransactions,
  medicalRecords,
  notifications,
  products,
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

// Demo staff (perform treatments + eligible for bonuses). Owner manages the
// real list; these make the report + bonus testable locally. `role` = the staff
// type used across the bonus rules.
const beauticianSeed = [
  { id: 'bt-sinta', name: 'Sinta Wijaya', role: 'beautician' },
  { id: 'bt-dewi', name: 'Dewi Anggraini', role: 'beautician' },
  { id: 'bt-rani', name: 'Rani Kusuma', role: 'perawat' },
  { id: 'bt-maya', name: 'Maya Lestari', role: 'frontoffice' },
  { id: 'bt-tari', name: 'Tari Puspita', role: 'terapis' },
]

// Skincare / retail products (for the closing-upsell 5% bonus).
const productSeed = [
  { id: 'prd-sunscreen', name: 'Sunscreen SPF50', price: 185_000, description: 'Perlindungan UVA/UVB harian, ringan & tidak lengket. 30 ml.' },
  { id: 'prd-serum-vitc', name: 'Serum Vitamin C', price: 320_000, description: 'Mencerahkan & meratakan warna kulit. Antioksidan tinggi. 20 ml.' },
  { id: 'prd-moisturizer', name: 'Barrier Moisturizer', price: 245_000, description: 'Menguatkan skin barrier, melembapkan tanpa berminyak. 50 ml.' },
  { id: 'prd-cleanser', name: 'Gentle Cleanser', price: 165_000, description: 'Pembersih lembut pH seimbang untuk semua jenis kulit. 100 ml.' },
]

export async function seedDatabase() {
  // FK-safe wipe
  await db.delete(closings)
  await db.delete(assists)
  await db.delete(products)
  await db.delete(inventoryMovements)
  await db.delete(inventoryItems)
  await db.delete(notifications)
  await db.delete(doctorTreatments)
  await db.delete(loyaltyTransactions)
  await db.delete(medicalRecords)
  await db.delete(transactions)
  await db.delete(bookingItems)
  await db.delete(bookings)
  await db.delete(beauticiansTbl)
  await db.delete(treatmentsTbl)
  await db.delete(session)
  await db.delete(account)
  await db.delete(verification)
  await db.delete(user)

  await db.insert(beauticiansTbl).values(beauticianSeed.map((b) => ({ ...b, isActive: true })))
  await db.insert(products).values(productSeed.map((p) => ({ ...p, isActive: true })))

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

  // ── Inventory admin (role 'admin') — inventory-only console at /admin ──
  await db.insert(user).values({
    id: 'admin-ameris',
    name: 'Admin Inventory',
    email: 'admin@ameris.local',
    emailVerified: true,
    role: 'admin',
    phone: '0811-0000-0009',
    birthDate: '1995-05-05',
    loyaltyPoints: 0,
    createdAt: new Date('2026-02-01'),
  })

  // ── Credential passwords (email + password auth) ──
  // One Better-Auth-hashed password row per user; everyone shares DEMO_PASSWORD.
  const ctx = await auth.$context
  const passwordHash = await ctx.password.hash(DEMO_PASSWORD)
  const allUserIds = ['owner-meriana', 'admin-ameris', ...patients.map((p) => p.id), ...doctors.map((d) => d.id)]
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
  // Per-unit quick-pick presets for the (per-unit) Botox treatments. Owner can
  // edit these later in the catalog admin.
  const unitPresetsById: Record<string, string> = {
    'botox-korea': '50=daerah tertentu, 100=full face',
    'botox-us': '50=daerah tertentu, 100=full face',
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
        minUnits: t.minUnits ?? 1,
        unitPresets: unitPresetsById[t.id] ?? null,
        isAvailable: t.available,
        isPromo: !!promo,
        isBestSeller: !!t.bestSeller,
        isHeroFeatured: !!t.heroFeatured,
        pointCost: redeemableIds.has(t.id) ? pointOf(price) : null,
        // Seed a plausible flat bonus (~5% of price, rounded to Rp1.000, capped
        // Rp50.000). Owner overrides per treatment in the catalog editor.
        beauticianBonus: Math.min(50_000, Math.round((price * 0.05) / 1000) * 1000),
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
  // Round-robin a beautician onto every already-completed booking so the report
  // and bonus totals have data. In-flight bookings stay unattributed until the
  // owner picks a beautician on the schedule board.
  const btIds = beauticianSeed.map((b) => b.id)
  let btN = 0
  const nextBt = () => btIds[btN++ % btIds.length]
  for (const b of ownerBookings) {
    await db.insert(bookings).values({
      id: b.id,
      userId: b.patientId,
      bookingDate: b.date,
      bookingTime: b.time,
      status: b.status,
      total: b.total,
      beauticianId: b.status === 'Selesai' ? nextBt() : null,
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
        earnBookings.push({ id, userId: earnPatients[earnN % earnPatients.length], bookingDate: date, bookingTime: '11:00', status: 'Selesai', total: t.price, beauticianId: nextBt(), createdAt: at })
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

  // ── Inventory (sample across the 4 categories; owner imports the real Stock
  // Opname from Excel). Includes an expired + a near-expiry obat and a
  // low-stock item so the alert strip is exercised. Each gets an opening move. ──
  const invSeed: { id: string; name: string; category: string; spec?: string; unit: string; stock: number; rawCount?: string; minStock?: number; expiry?: string; notes?: string }[] = [
    { id: 'inv-showercap', name: 'Shower cap', category: 'Alat', unit: 'pcs', stock: 32 },
    { id: 'inv-spuit5', name: 'Spuit', category: 'Alat', spec: '5 cc', unit: 'pcs', stock: 2, minStock: 5 },
    { id: 'inv-shaver', name: 'Shaver', category: 'Alat', unit: 'pcs', stock: 7, rawCount: '2 + 1 + 4', notes: 'dibuka 2' },
    { id: 'inv-aloe', name: 'Masker aloe vera', category: 'Bahan', unit: 'pcs', stock: 6 },
    { id: 'inv-serumbright', name: 'Serum brightening', category: 'Bahan', unit: 'botol', stock: 2, minStock: 3 },
    { id: 'inv-botox', name: 'Botox', category: 'Bahan - Treatment Baru', unit: 'IU', stock: 60 },
    { id: 'inv-remedium', name: 'Re Medium Filler', category: 'Bahan - Treatment Baru', unit: 'box', stock: 0, minStock: 1 },
    { id: 'inv-fyp-serum', name: 'Serum', category: 'Skincare Retail', spec: 'FYP', unit: 'pcs', stock: 38 },
    { id: 'inv-txera-cleanser', name: 'Cleanser', category: 'Skincare Retail', spec: 'Txera', unit: 'pcs', stock: 29 },
    { id: 'inv-lido', name: 'Lidocaine', category: 'Obat', unit: 'pcs', stock: 2, expiry: '2026-08', notes: 'kemungkinan Lidocaine' },
    { id: 'inv-biogastron', name: 'Bio gastron', category: 'Obat', unit: 'tablet', stock: 90, rawCount: '9 × 10', expiry: '2026-09', notes: 'exp 2 bulan lagi' },
    { id: 'inv-vistat', name: 'Vistat', category: 'Obat', unit: 'pcs', stock: 20 },
    { id: 'inv-diphen', name: 'Diphenhydramine inj', category: 'P3K & Emergency', spec: 'Set P3K (1 set)', unit: 'pcs', stock: 2, expiry: '2026-02', notes: 'SUDAH EXPIRED — segera diganti' },
    { id: 'inv-hansaplast', name: 'Hansaplast', category: 'P3K & Emergency', spec: 'P3K kecil', unit: 'pcs', stock: 6 },
  ]
  await db.insert(inventoryItems).values(invSeed.map((i) => ({ ...i, spec: i.spec ?? null, rawCount: i.rawCount ?? null, minStock: i.minStock ?? 0, expiry: i.expiry ?? null, notes: i.notes ?? null })))
  await db.insert(inventoryMovements).values(invSeed.map((i) => ({ id: randomUUID(), itemId: i.id, delta: i.stock, reason: 'opname', note: 'Stok awal (seed)', balanceAfter: i.stock })))

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
