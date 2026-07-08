// Domain tables per PRD §6 (Treatments, Bookings, BookingItems, Transactions,
// MedicalRecords) plus loyalty ledger & notifications needed by the UI.
// Enum-like columns are text to match the exact Indonesian literals the UI keys on.
import { boolean, integer, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export type TreatmentCategory =
  | 'Facial'
  | 'Peeling'
  | 'Laser'
  | 'Skinbooster'
  | 'Injeksi'
  | 'Paket'

export type BookingStatus =
  | 'Menunggu'
  | 'Dikonfirmasi'
  | 'Hadir'
  | 'Selesai'
  | 'Batal'

export type PaymentMethod = 'Online' | 'Offline'
export type PaymentStatus = 'Pending' | 'Lunas'
export type NotifType = 'reminder' | 'promo' | 'point' | 'birthday'

export const treatments = pgTable('treatments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  blurb: text('blurb').notNull().default(''),
  // Optional English subtitle. When set, the public site shows it instead of
  // `blurb` while the visitor's language is English. Owner-managed.
  blurbEn: text('blurb_en'),
  category: text('category').notNull(),
  duration: text('duration').notNull().default(''),
  price: integer('price').notNull().default(0),
  // When true the price is charged per unit (e.g. Botox per unit) — the website
  // renders it as "Rp45.000/unit".
  pricePerUnit: boolean('price_per_unit').notNull().default(false),
  // For per-unit treatments: the minimum units a patient must book (e.g. Botox
  // full face = 50). 1 = no special minimum. Enforced server-side at checkout.
  minUnits: integer('min_units').notNull().default(1),
  // Optional comma-separated quick-pick unit counts shown as buttons on the
  // detail page, e.g. "50,100". Empty = stepper only. Per-unit treatments only.
  unitPresets: text('unit_presets'),
  isAvailable: boolean('is_available').notNull().default(true),
  isPromo: boolean('is_promo').notNull().default(false),
  isBestSeller: boolean('is_best_seller').notNull().default(false),
  // The single treatment featured in the landing hero card. Owner-controlled,
  // single-select (turning one on clears the others).
  isHeroFeatured: boolean('is_hero_featured').notNull().default(false),
  pointCost: integer('point_cost'),
  // Fixed rupiah bonus paid to the beautician who performs this treatment.
  // Same for every beautician (owner sets it per treatment); 0 = no bonus.
  beauticianBonus: integer('beautician_bonus').notNull().default(0),
  image: text('image'),
  promoWas: integer('promo_was'),
  promoNow: integer('promo_now'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Clinic staff roster (not login users — owner-managed). Originally just
// beauticians; now the general staff list, so the table keeps its name but the
// UI calls it "Staf". `role` distinguishes beautician / perawat (nurse) /
// frontoffice / terapis. Doctors stay separate (they are login users).
export type StaffRole = 'beautician' | 'perawat' | 'frontoffice' | 'terapis'

export const beauticians = pgTable('beauticians', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull().default('beautician'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Skincare / retail products the clinic sells (separate from treatments).
// Used for the closing/upselling bonus (5% of price) and future retail sales.
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: integer('price').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Closing / upselling: a deal made AFTER the patient left the doctor's room —
// any staff (front office, doctor, therapist, beautician) can close, and one
// booking can have several. Owner records them on the schedule. Bonus is a
// snapshot: treatment → 1% of price, skincare → 5% of price.
export const closings = pgTable('closings', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull(), // beauticians.id or a doctor user id (plain text)
  kind: text('kind').notNull(), // 'treatment' | 'skincare'
  itemId: text('item_id'), // treatments.id or products.id (plain text, snapshot below)
  itemName: text('item_name').notNull(),
  price: integer('price').notNull(),
  bonus: integer('bonus').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Doctor-assistance bonus (for non-facial procedures the staff assisted on).
// Owner marks who assisted a booking; bonus is a snapshot of the flat rate at
// record time: Rp10.000 when the booking total > Rp1jt, else Rp5.000.
export const assists = pgTable('assists', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull(),
  bonus: integer('bonus').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(), // AMR-xxxx
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  bookingDate: text('booking_date').notNull(), // YYYY-MM-DD (local)
  bookingTime: text('booking_time').notNull(), // HH:MM
  status: text('status').notNull().default('Menunggu'),
  total: integer('total').notNull().default(0), // authoritative total AFTER any voucher discount
  // Voucher applied at checkout (plain text — no FK, so deleting a voucher never
  // touches historical bookings). discountAmount = rupiah taken off the subtotal.
  voucherId: text('voucher_id'),
  discountAmount: integer('discount_amount').notNull().default(0),
  // Which beautician performed this visit (plain text, no FK — keeps historical
  // reports intact if a beautician is later removed). Owner sets it on the
  // schedule board; null = not yet attributed.
  beauticianId: text('beautician_id'),
  // Which doctor performed this visit, when the treatment series is doctor-led
  // (injeksi/laser/filler — nothing needs a facial specialist). Plain text /
  // user.id, no FK. Mutually exclusive with beauticianId in the POS picker;
  // null = performed by a beautician or not attributed. Kept separate so the
  // per-treatment beautician bonus never lands on a doctor.
  doctorId: text('doctor_id'),
  // How the booking was created: 'online' = patient self-booked via the portal,
  // 'walkin' = staff created it at the clinic (POS / doctor consultation).
  source: text('source').notNull().default('online'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const bookingItems = pgTable('booking_items', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  treatmentId: text('treatment_id'),
  nameAtBooking: text('name_at_booking').notNull(),
  priceAtBooking: integer('price_at_booking').notNull(),
  qty: integer('qty').notNull().default(1),
})

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  paymentMethod: text('payment_method').notNull(), // Online | Offline
  paymentStatus: text('payment_status').notNull().default('Pending'), // Pending | Lunas
  paymentPlan: text('payment_plan'), // full | dp | null
  // Midtrans Snap fields (online payments). Empty until a Snap session is opened.
  midtransOrderId: text('midtrans_order_id'), // order_id sent to Midtrans (maps webhook → booking)
  midtransStatus: text('midtrans_status'), // last transaction_status (settlement|pending|expire|…)
  snapToken: text('snap_token'), // most recent Snap token
  paidAt: timestamp('paid_at'), // when the online payment settled
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Treatments a doctor performs + the doctor's revenue-share %, set by the owner.
export const doctorTreatments = pgTable('doctor_treatments', {
  id: text('id').primaryKey(),
  doctorId: text('doctor_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  treatmentId: text('treatment_id')
    .notNull()
    .references(() => treatments.id, { onDelete: 'cascade' }),
  sharePct: integer('share_pct').notNull().default(0), // 0–100, owner-configurable
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const medicalRecords = pgTable('medical_records', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  bookingId: text('booking_id'),
  treatment: text('treatment').notNull(),
  skin: text('skin'),
  notes: text('notes').notNull().default(''),
  beforeImage: text('before_image'),
  afterImage: text('after_image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  delta: integer('delta').notNull(),
  bookingId: text('booking_id'),
  treatmentId: text('treatment_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Simple key-value store for owner-editable settings. Avoids a one-off table
// per setting. Currently unused (the manual QRIS image it once held was
// replaced by Midtrans-generated QRIS/VA) — kept for future settings.
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Vouchers ──
// Owner-created discounts auto-applied at checkout to eligible users. Never stack
// with promo prices (promo items are excluded from the discount). Discount is
// computed authoritatively server-side and recorded in voucher_redemptions.
export type VoucherDiscountType = 'pct' | 'amount'
export type VoucherAudience = 'new_user' | 'all' | 'specific'

export const vouchers = pgTable('vouchers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  discountType: text('discount_type').notNull().default('pct'), // 'pct' | 'amount'
  discountValue: integer('discount_value').notNull().default(0), // 20 = 20% ; 50000 = Rp50.000
  audience: text('audience').notNull().default('all'), // 'new_user' | 'all' | 'specific'
  // true → applies to every non-promo treatment; false → only the treatments
  // listed in voucher_treatments.
  appliesToAllNormal: boolean('applies_to_all_normal').notNull().default(false),
  // How the discount lands across the cart:
  //   'cart'          → across all eligible (in-scope, non-promo) lines (default)
  //   'one_treatment' → a single treatment the patient picks at checkout
  applyScope: text('apply_scope').notNull().default('cart'),
  // 'new_user' eligibility window: valid while now <= user.createdAt + N days.
  newUserWindowDays: integer('new_user_window_days').notNull().default(7),
  // Optional absolute calendar window (applies to every audience when set).
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  maxUsesPerUser: integer('max_uses_per_user').notNull().default(1),
  // Optional minimum cart subtotal (Rp) required before the discount applies.
  // 0 = no minimum.
  minSpend: integer('min_spend').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Treatments a voucher applies to (the owner's "pilihan"). Ignored when the
// voucher has appliesToAllNormal = true.
export const voucherTreatments = pgTable('voucher_treatments', {
  id: text('id').primaryKey(),
  voucherId: text('voucher_id')
    .notNull()
    .references(() => vouchers.id, { onDelete: 'cascade' }),
  treatmentId: text('treatment_id')
    .notNull()
    .references(() => treatments.id, { onDelete: 'cascade' }),
})

// Specific users allowed to use a voucher (only for audience = 'specific').
export const voucherUsers = pgTable('voucher_users', {
  id: text('id').primaryKey(),
  voucherId: text('voucher_id')
    .notNull()
    .references(() => vouchers.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

// One row per redemption — enforces maxUsesPerUser and provides an audit trail.
export const voucherRedemptions = pgTable('voucher_redemptions', {
  id: text('id').primaryKey(),
  voucherId: text('voucher_id')
    .notNull()
    .references(() => vouchers.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  bookingId: text('booking_id'), // plain text — booking lifecycle is independent
  amountDiscounted: integer('amount_discounted').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Inventory ──
// Clinic supplies across 4 categories (matches the owner's Stock Opname sheets):
// Alat (tools), Bahan (consumables), Obat (medicines), P3K (first-aid/emergency).
// `stock` is the running balance; every change is also written to
// inventory_movements so the in/out history is fully auditable.
export type InventoryCategory = 'Alat' | 'Bahan' | 'Obat' | 'P3K'

export const inventoryItems = pgTable('inventory_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  // Optional spesifikasi/ukuran (e.g. Spuit "5 cc", Needle "30 × 13 mm").
  spec: text('spec'),
  unit: text('unit').notNull().default('pcs'), // satuan: pcs/unit/botol/pack/set/box…
  // Running balance. real (not integer) because the source data has fractions
  // like "5 ½" (cotton bud pack).
  stock: real('stock').notNull().default(0),
  // Low-stock alert threshold; 0 = no alert.
  minStock: real('min_stock').notNull().default(0),
  // Expiry as 'YYYY-MM-DD' (or 'YYYY-MM'); null = not tracked / non-perishable.
  // Mostly for Obat & P3K. Near-expiry / expired status is computed from this.
  expiry: text('expiry'),
  notes: text('notes'),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Full in/out audit trail. delta > 0 = masuk (pembelian/koreksi naik),
// delta < 0 = keluar (pemakaian/koreksi turun). balanceAfter snapshots the
// item's stock right after this movement.
export const inventoryMovements = pgTable('inventory_movements', {
  id: text('id').primaryKey(),
  itemId: text('item_id')
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'cascade' }),
  delta: real('delta').notNull(),
  reason: text('reason').notNull(), // pembelian | pemakaian | penyesuaian | opname | import
  note: text('note'),
  balanceAfter: real('balance_after').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
