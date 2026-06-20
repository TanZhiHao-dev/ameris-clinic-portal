// Mock customer account data (frontend-only phase).

export const currentUser = {
  name: 'Sarah Putri',
  phone: '0812-3456-7890',
  email: 'sarah.putri@email.com',
  birthDate: '1996-06-25',
  points: 14,
  memberSince: 'Feb 2026',
}

export type BookingStatus = 'Menunggu' | 'Dikonfirmasi' | 'Hadir' | 'Selesai' | 'Batal'

export type Appointment = {
  id: string
  items: { name: string; price: number }[]
  date: string // ISO
  time: string
  status: BookingStatus
  payment: 'Online' | 'Klinik'
  total: number
}

export const appointments: Appointment[] = [
  {
    id: 'AMR-2410',
    items: [{ name: 'Korean Pico Glow — Blackdoll Pico Laser', price: 850_000 }],
    date: '2026-06-24',
    time: '13:00',
    status: 'Dikonfirmasi',
    payment: 'Online',
    total: 850_000,
  },
  {
    id: 'AMR-2415',
    items: [{ name: 'Meso Anti Aging', price: 550_000 }],
    date: '2026-06-30',
    time: '11:00',
    status: 'Menunggu',
    payment: 'Klinik',
    total: 550_000,
  },
  {
    id: 'AMR-2351',
    items: [
      { name: 'Platinum Glow Facial', price: 370_000 },
      { name: 'Brightening Peeling Face/Neck', price: 250_000 },
    ],
    date: '2026-06-12',
    time: '10:00',
    status: 'Selesai',
    payment: 'Klinik',
    total: 620_000,
  },
  {
    id: 'AMR-2298',
    items: [{ name: 'Hydra Renewal Signature', price: 1_230_000 }],
    date: '2026-05-28',
    time: '15:00',
    status: 'Selesai',
    payment: 'Online',
    total: 1_230_000,
  },
]

export const pointHistory = [
  { label: 'Rejuran HB Plus', date: '2 Jun 2026', delta: 5 },
  { label: 'Filler', date: '15 Mei 2026', delta: 2 },
  { label: 'Tukar poin — Ameris Basic Facial', date: '10 Mei 2026', delta: -1 },
  { label: 'Hydra Renewal Signature', date: '28 Mei 2026', delta: 1 },
  { label: 'Cell Booster Glow', date: '20 Apr 2026', delta: 2 },
  { label: 'Pico Laser Ultimate Exosome', date: '5 Apr 2026', delta: 3 },
]

export type NotifType = 'reminder' | 'promo' | 'point' | 'birthday'

export const notifications: {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
  unread: boolean
}[] = [
  {
    id: 'n1',
    type: 'reminder',
    title: 'Pengingat treatment',
    body: 'Booking Korean Pico Glow kamu dikonfirmasi untuk 24 Juni, 13:00 WIB.',
    time: '1 jam lalu',
    unread: true,
  },
  {
    id: 'n2',
    type: 'promo',
    title: 'Promo paket minggu ini',
    body: 'Hydra Renewal Premium hemat Rp1.200.000. Berlaku terbatas.',
    time: 'Kemarin',
    unread: true,
  },
  {
    id: 'n3',
    type: 'birthday',
    title: 'Hadiah ulang tahun menanti 🎁',
    body: 'Kejutan promo spesial menyambut ulang tahunmu. Cek lebih dekat ke tanggalnya!',
    time: '2 hari lalu',
    unread: false,
  },
  {
    id: 'n4',
    type: 'point',
    title: 'Poin Privilege bertambah',
    body: '+5 poin dari Rejuran HB Plus. Saldo poinmu kini 14.',
    time: '5 hari lalu',
    unread: false,
  },
]

/** Days until the next birthday from `today` (both as local Date). */
export function daysUntilBirthday(birthIso: string, today: Date) {
  const b = new Date(birthIso + 'T00:00:00')
  const next = new Date(today.getFullYear(), b.getMonth(), b.getDate())
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (next < t0) next.setFullYear(today.getFullYear() + 1)
  return Math.round((next.getTime() - t0.getTime()) / 86_400_000)
}

export const birthdayLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })

export const statusTone: Record<BookingStatus, { bg: string; color: string }> = {
  Menunggu: { bg: 'rgba(197,135,108,0.16)', color: 'var(--color-rose)' },
  Dikonfirmasi: { bg: 'rgba(154,115,32,0.14)', color: 'var(--color-gold-deep)' },
  Hadir: { bg: 'rgba(47,111,106,0.14)', color: '#2f6f6a' },
  Selesai: { bg: 'rgba(44,88,72,0.12)', color: '#2c5848' },
  Batal: { bg: 'rgba(140,124,106,0.14)', color: 'var(--color-ink-muted)' },
}

export const formatDateId = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
