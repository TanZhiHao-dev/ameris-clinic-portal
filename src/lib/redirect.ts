// Post-login "kembali ke halaman asal" — only same-site paths are honored so a
// crafted ?redirect=https://evil.example (or protocol-relative //evil.example)
// can never bounce a fresh login off-site.
export const safeInternalPath = (p?: string): string | undefined =>
  p && p.startsWith('/') && !p.startsWith('//') ? p : undefined
