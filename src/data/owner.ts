// Mock owner/admin data (frontend-only phase). Mirrors PRD schema:
// Bookings, BookingItems, Transactions, MedicalRecords, Users(patients).
import { formatRp } from './clinic'

export { formatRp }

export const ownerUser = {
  name: 'dr. Meriana, M.Kes',
  role: 'Owner',
  clinic: 'Ameris Aesthetic Clinic',
  location: 'Gading Serpong',
}

// Reference "today" for the demo schedule.
export const TODAY = '2026-06-20'

export type OwnerStatus = 'Menunggu' | 'Dikonfirmasi' | 'Hadir' | 'Selesai' | 'Batal'
export type PayStatus = 'Pending' | 'Lunas'

export type OwnerBooking = {
  id: string
  patientId: string
  patientName: string
  items: { name: string; price: number }[]
  date: string
  time: string
  status: OwnerStatus
  payment: 'Online' | 'Klinik'
  payStatus: PayStatus
  total: number
}

export const bookings: OwnerBooking[] = [
  { id: 'AMR-2501', patientId: 'p1', patientName: 'Sarah Putri', items: [{ name: 'Blackdoll Pico Laser', price: 850_000 }], date: '2026-06-20', time: '10:00', status: 'Dikonfirmasi', payment: 'Online', payStatus: 'Lunas', total: 850_000 },
  { id: 'AMR-2502', patientId: 'p2', patientName: 'Andini Lestari', items: [{ name: 'Platinum Glow Facial', price: 370_000 }], date: '2026-06-20', time: '11:00', status: 'Hadir', payment: 'Klinik', payStatus: 'Pending', total: 370_000 },
  { id: 'AMR-2503', patientId: 'p3', patientName: 'Bunga Maharani', items: [{ name: 'Rejuran HB Plus', price: 5_000_000 }], date: '2026-06-20', time: '13:00', status: 'Menunggu', payment: 'Online', payStatus: 'Pending', total: 5_000_000 },
  { id: 'AMR-2504', patientId: 'p4', patientName: 'Citra Dewi', items: [{ name: 'Hydra Renewal Signature', price: 1_230_000 }], date: '2026-06-20', time: '14:00', status: 'Dikonfirmasi', payment: 'Online', payStatus: 'Lunas', total: 1_230_000 },
  { id: 'AMR-2505', patientId: 'p5', patientName: 'Rina Anggraini', items: [{ name: 'Meso Anti Aging', price: 550_000 }], date: '2026-06-20', time: '15:00', status: 'Selesai', payment: 'Klinik', payStatus: 'Lunas', total: 550_000 },
  { id: 'AMR-2506', patientId: 'p6', patientName: 'Maya Sari', items: [{ name: 'Acne Recovery Facial', price: 370_000 }], date: '2026-06-20', time: '16:00', status: 'Batal', payment: 'Online', payStatus: 'Pending', total: 370_000 },
  { id: 'AMR-2507', patientId: 'p7', patientName: 'Dewi Kartika', items: [{ name: 'Filler', price: 2_000_000 }], date: '2026-06-21', time: '10:00', status: 'Dikonfirmasi', payment: 'Online', payStatus: 'Lunas', total: 2_000_000 },
  { id: 'AMR-2508', patientId: 'p8', patientName: 'Fitri Handayani', items: [{ name: 'Botox Korea (20 unit)', price: 900_000 }], date: '2026-06-21', time: '11:00', status: 'Menunggu', payment: 'Klinik', payStatus: 'Pending', total: 900_000 },
  { id: 'AMR-2499', patientId: 'p1', patientName: 'Sarah Putri', items: [{ name: 'Hydra Renewal Signature', price: 1_230_000 }], date: '2026-05-28', time: '15:00', status: 'Selesai', payment: 'Online', payStatus: 'Lunas', total: 1_230_000 },
  { id: 'AMR-2480', patientId: 'p3', patientName: 'Bunga Maharani', items: [{ name: 'Cell Booster Glow', price: 2_000_000 }], date: '2026-05-20', time: '13:00', status: 'Selesai', payment: 'Online', payStatus: 'Lunas', total: 2_000_000 },
]

export type Patient = {
  id: string
  name: string
  phone: string
  birthDate: string
  points: number
  visits: number
  lastVisit: string
  joined: string
}

export const patients: Patient[] = [
  { id: 'p1', name: 'Sarah Putri', phone: '0812-3456-7890', birthDate: '1996-06-25', points: 14, visits: 8, lastVisit: '2026-05-28', joined: '2026-02-10' },
  { id: 'p2', name: 'Andini Lestari', phone: '0813-2211-4567', birthDate: '1994-03-12', points: 6, visits: 5, lastVisit: '2026-06-12', joined: '2026-02-22' },
  { id: 'p3', name: 'Bunga Maharani', phone: '0857-9988-1234', birthDate: '1999-11-03', points: 9, visits: 4, lastVisit: '2026-05-20', joined: '2026-03-05' },
  { id: 'p4', name: 'Citra Dewi', phone: '0811-5566-7788', birthDate: '1992-07-19', points: 3, visits: 3, lastVisit: '2026-06-01', joined: '2026-03-18' },
  { id: 'p5', name: 'Rina Anggraini', phone: '0821-3344-9090', birthDate: '1997-01-28', points: 11, visits: 7, lastVisit: '2026-06-20', joined: '2026-02-15' },
  { id: 'p6', name: 'Maya Sari', phone: '0852-7766-2211', birthDate: '1995-09-09', points: 2, visits: 2, lastVisit: '2026-04-30', joined: '2026-04-02' },
  { id: 'p7', name: 'Dewi Kartika', phone: '0838-1122-3344', birthDate: '1990-12-15', points: 18, visits: 12, lastVisit: '2026-06-15', joined: '2026-02-08' },
  { id: 'p8', name: 'Fitri Handayani', phone: '0877-4455-6677', birthDate: '2000-05-22', points: 1, visits: 1, lastVisit: '2026-06-10', joined: '2026-05-28' },
]

export type MedicalRecord = {
  id: string
  patientId: string
  bookingId: string
  date: string
  treatment: string
  skin: string
  notes: string
}

export const medicalRecords: MedicalRecord[] = [
  { id: 'mr1', patientId: 'p1', bookingId: 'AMR-2499', date: '2026-05-28', treatment: 'Hydra Renewal Signature', skin: 'Kulit dehidrasi, pori sedang di area T-zone', notes: 'Hidrasi membaik signifikan. Sarankan maintenance tiap 2 minggu + sunscreen rutin.' },
  { id: 'mr2', patientId: 'p1', bookingId: 'AMR-2480', date: '2026-04-20', treatment: 'Cell Booster Glow', skin: 'Kusam, garis halus ringan', notes: 'Glow meningkat. Lanjut booster bulan depan.' },
  { id: 'mr3', patientId: 'p3', bookingId: 'AMR-2480', date: '2026-05-20', treatment: 'Cell Booster Glow', skin: 'Tekstur tidak rata, bekas jerawat ringan', notes: 'Respon baik, minim downtime. Pertimbangkan microneedling sesi berikut.' },
  { id: 'mr4', patientId: 'p5', bookingId: 'AMR-2505', date: '2026-06-20', treatment: 'Meso Anti Aging', skin: 'Elastisitas menurun, kulit normal', notes: 'Kencang setelah sesi. Edukasi skincare anti-aging di rumah.' },
]

// Revenue series per selectable interval for the dashboard chart.
export type RevPoint = { label: string; value: number }

export const revenueRanges: { key: string; label: string; data: RevPoint[] }[] = [
  {
    key: '7h',
    label: '7 Hari',
    data: [
      { label: 'Sen', value: 2_100_000 },
      { label: 'Sel', value: 3_400_000 },
      { label: 'Rab', value: 1_800_000 },
      { label: 'Kam', value: 4_200_000 },
      { label: 'Jum', value: 3_050_000 },
      { label: 'Sab', value: 6_300_000 },
      { label: 'Min', value: 2_700_000 },
    ],
  },
  {
    key: '4w',
    label: '4 Minggu',
    data: [
      { label: 'Mg 1', value: 14_200_000 },
      { label: 'Mg 2', value: 18_600_000 },
      { label: 'Mg 3', value: 12_900_000 },
      { label: 'Mg 4', value: 23_550_000 },
    ],
  },
  {
    key: '6m',
    label: '6 Bulan',
    data: [
      { label: 'Jan', value: 12_400_000 },
      { label: 'Feb', value: 34_800_000 },
      { label: 'Mar', value: 41_200_000 },
      { label: 'Apr', value: 38_500_000 },
      { label: 'Mei', value: 52_300_000 },
      { label: 'Jun', value: 47_900_000 },
    ],
  },
]

export const statusTone: Record<OwnerStatus, { bg: string; color: string }> = {
  Menunggu: { bg: 'rgba(197,135,108,0.16)', color: 'var(--color-rose)' },
  Dikonfirmasi: { bg: 'rgba(154,115,32,0.14)', color: 'var(--color-gold-deep)' },
  Hadir: { bg: 'rgba(47,111,106,0.14)', color: '#2f6f6a' },
  Selesai: { bg: 'rgba(44,88,72,0.14)', color: '#2c5848' },
  Batal: { bg: 'rgba(140,124,106,0.14)', color: 'var(--color-ink-muted)' },
}

export const payTone: Record<PayStatus, { bg: string; color: string }> = {
  Lunas: { bg: 'rgba(44,88,72,0.14)', color: '#2c5848' },
  Pending: { bg: 'rgba(197,135,108,0.16)', color: 'var(--color-rose)' },
}

export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export const fmtDateLong = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
