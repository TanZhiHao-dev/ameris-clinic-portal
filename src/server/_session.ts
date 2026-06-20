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
