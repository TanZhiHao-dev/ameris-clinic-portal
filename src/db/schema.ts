// Domain tables per PRD §6 (Treatments, Bookings, BookingItems, Transactions,
// MedicalRecords) plus loyalty ledger & notifications needed by the UI.
// Enum-like columns are text to match the exact Indonesian literals the UI keys on.
import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
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
  category: text('category').notNull(),
  duration: text('duration').notNull().default(''),
  price: integer('price').notNull().default(0),
  // When true the price is charged per unit (e.g. Botox per unit) — the website
  // renders it as "Rp45.000/unit".
  pricePerUnit: boolean('price_per_unit').notNull().default(false),
  isAvailable: boolean('is_available').notNull().default(true),
  isPromo: boolean('is_promo').notNull().default(false),
  isBestSeller: boolean('is_best_seller').notNull().default(false),
  pointCost: integer('point_cost'),
  image: text('image'),
  promoWas: integer('promo_was'),
  promoNow: integer('promo_now'),
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
  total: integer('total').notNull().default(0),
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

// Simple key-value store for owner-editable settings (e.g. the QRIS payment
// image as a data-URL). Avoids a one-off table per setting.
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
