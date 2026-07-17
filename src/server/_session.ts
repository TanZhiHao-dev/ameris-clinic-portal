import { getRequestHeaders, setResponseStatus } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string | null
  phone: string | null
  birthDate: string | null
  loyaltyPoints: number | null
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  return (session?.user as SessionUser | undefined) ?? null
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser()
  if (!u) {
    setResponseStatus(401)
    throw new Error('Silakan masuk terlebih dahulu.')
  }
  return u
}

export async function requireOwner(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'owner') {
    setResponseStatus(403)
    throw new Error('Akses khusus owner.')
  }
  return u
}

export async function requireDoctor(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'dokter') {
    setResponseStatus(403)
    throw new Error('Akses khusus dokter.')
  }
  return u
}

// Clinic staff: owner OR doctor (shared patient/EMR/schedule access).
export async function requireStaff(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'owner' && u.role !== 'dokter') {
    setResponseStatus(403)
    throw new Error('Akses khusus staf klinik.')
  }
  return u
}

// Inventory managers: the owner OR a dedicated inventory admin. Kept separate
// from requireStaff so an inventory admin never gains patient/EMR/finance access.
export async function requireInventory(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'owner' && u.role !== 'admin') {
    setResponseStatus(403)
    throw new Error('Akses khusus owner / admin.')
  }
  return u
}

// Before/After photo studio: the owner OR the admin. This narrowly extends the
// admin's reach to a patient-name picker + photo capture ONLY — the photo server
// fns never return medical records, bookings, or finance, so the "no EMR/finance
// for admin" boundary above still holds.
export async function requirePhotoAccess(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'owner' && u.role !== 'admin') {
    setResponseStatus(403)
    throw new Error('Akses khusus owner / admin.')
  }
  return u
}

// Register (POS): owner, doctor OR admin. The admin is front-desk here — they
// may INPUT a sale, but posCreateSale forces their sales to stay an unpaid
// tagihan (only the owner settles), and they never get editing, the
// transactions list, reports, or doctor revenue-share. The POS server fns are
// deliberately narrow (name/phone picker + catalog) rather than reusing the
// owner/EMR ones.
export async function requirePos(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'owner' && u.role !== 'dokter' && u.role !== 'admin') {
    setResponseStatus(403)
    throw new Error('Akses khusus staf klinik.')
  }
  return u
}
