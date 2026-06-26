// A patient may only use the app once their core contact details are on file.
// Email signup never collects a WhatsApp number (and birth date is optional),
// and Google signup collects none of the three — so any patient missing a name,
// phone, or birth date is funnelled to /lengkapi-profil before /akun.
export function profileNeedsCompletion(
  user: { name?: string | null; phone?: string | null; birthDate?: string | null } | null | undefined,
): boolean {
  if (!user) return false
  return !user.name?.trim() || !user.phone?.trim() || !user.birthDate?.trim()
}
