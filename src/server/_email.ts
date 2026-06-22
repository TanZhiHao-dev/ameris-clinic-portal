// Server-only transactional email via Resend (REST, no SDK — same approach as
// _midtrans.ts). Reads RESEND_API_KEY, so it must never be imported by a client
// component (underscore prefix = server-only). When no key is set it falls back
// to logging the message to the server console, so dev + an un-configured prod
// still surface the link instead of failing.
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const RESEND_FROM = process.env.RESEND_FROM ?? 'Ameris Aesthetic Clinic <onboarding@resend.dev>'

export const emailConfigured = RESEND_API_KEY.length > 0

type SendEmailInput = { to: string; subject: string; html: string; text?: string }

const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// Never throws: a delivery failure must not break the caller (e.g. password
// reset stays privacy-safe and doesn't leak whether the address exists).
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<{
  ok: boolean
  id?: string
  simulated?: boolean
  error?: string
}> {
  if (!emailConfigured) {
    console.log(`\n[email:dev] to=${to} subject="${subject}"\n${text ?? stripHtml(html)}\n`)
    return { ok: true, simulated: true }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html, ...(text ? { text } : {}) }),
    })
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${data?.name ?? ''} ${data?.message ?? ''}`)
      return { ok: false, error: data?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, id: data?.id }
  } catch (e) {
    console.error('[email] send failed:', (e as Error).message)
    return { ok: false, error: (e as Error).message }
  }
}

// ── Branded templates ──
const GOLD = '#b58a32'
const ESPRESSO = '#2b2118'
const CREAM = '#f7f0e6'
const INK = '#3a2f24'
const MUTED = '#8c7c6a'

function shell(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${CREAM};">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;font-family:Helvetica,Arial,sans-serif;color:${INK};">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:26px;font-weight:700;letter-spacing:0.5px;color:${GOLD};">Ameris</div>
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${MUTED};margin-top:2px;">Aesthetic Clinic</div>
    </div>
    <div style="background:#fffdf9;border:1px solid #ece3d4;border-radius:16px;padding:32px 28px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:${ESPRESSO};">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;font-size:11px;color:${MUTED};margin-top:20px;">
      Ameris Aesthetic Clinic · Gading Serpong<br/>Email ini dikirim otomatis, mohon tidak membalas.
    </p>
  </div></body></html>`
}

export function resetPasswordEmail({ name, link }: { name: string; link: string }) {
  const subject = 'Atur ulang password Ameris'
  const html = shell(
    'Atur ulang password',
    `<p style="font-size:14px;line-height:1.6;color:${INK};margin:0 0 16px;">
       Halo${name ? ' ' + escapeHtml(name) : ''}, kami menerima permintaan untuk mengatur ulang password akun Ameris kamu.
     </p>
     <p style="font-size:14px;line-height:1.6;color:${INK};margin:0 0 24px;">
       Klik tombol di bawah untuk membuat password baru. Tautan ini berlaku selama 1 jam.
     </p>
     <div style="text-align:center;margin:0 0 24px;">
       <a href="${link}" style="display:inline-block;background:${GOLD};color:#3a2c0f;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:999px;">
         Atur ulang password
       </a>
     </div>
     <p style="font-size:12px;line-height:1.6;color:${MUTED};margin:0 0 6px;">
       Atau salin tautan ini ke browser:
     </p>
     <p style="font-size:12px;line-height:1.5;word-break:break-all;margin:0 0 20px;">
       <a href="${link}" style="color:${GOLD};">${link}</a>
     </p>
     <p style="font-size:12px;line-height:1.6;color:${MUTED};margin:0;">
       Kalau kamu tidak meminta ini, abaikan saja email ini — password kamu tetap aman.
     </p>`,
  )
  const text = `Halo${name ? ' ' + name : ''},\n\nKami menerima permintaan untuk mengatur ulang password akun Ameris kamu.\nBuka tautan berikut untuk membuat password baru (berlaku 1 jam):\n${link}\n\nKalau kamu tidak meminta ini, abaikan email ini.\n\nAmeris Aesthetic Clinic`
  return { subject, html, text }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}
