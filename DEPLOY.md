# Deploy — Coolify (VPS Linux)

Portal ini di-deploy sebagai container Docker (TanStack Start / Nitro `node-server`)
dengan **Postgres** sebagai database. PGlite (dev) otomatis diganti ke Postgres
saat `DATABASE_URL` di-set — tidak ada perubahan kode.

> ⚠️ `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash` dijalankan
> **DI SERVER LINUX**, bukan di Mac/laptop. Coolify butuh Docker + systemd (Linux).

## 1. Pasang Coolify di VPS
- Sewa VPS Linux (Ubuntu 22.04/24.04, **≥ 2 GB RAM**) — mis. Hetzner, DigitalOcean.
- SSH ke server, lalu:
  ```bash
  curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
  ```
- Buka `http://SERVER_IP:8000`, buat akun admin.

## 2. Database Postgres
Di Coolify: **+ New → Database → PostgreSQL** (atau pakai Neon/Supabase).
Salin connection string-nya untuk `DATABASE_URL`. Migrasi Drizzle dijalankan
**otomatis saat container boot** (`drizzle/` di-bundle ke image).

## 3. Buat aplikasi dari repo
- **+ New → Application → Private Repository (GitHub App)** → pilih
  `TanZhiHao-dev/ameris-clinic-portal`, branch `main`.
- **Build Pack: Dockerfile** (Coolify mendeteksi `Dockerfile` di root).
- **Port: 3000**. Set domain + aktifkan HTTPS (Let's Encrypt).

## 4. Environment Variables
Set di Coolify (tab Environment Variables):

| Variable | Wajib | Nilai |
|----------|:----:|-------|
| `DATABASE_URL` | ✅ | connection string Postgres (dari langkah 2) |
| `BETTER_AUTH_SECRET` | ✅ | string acak panjang → `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | ✅ | `https://domain-kamu` (URL publik final) |
| `VITE_APP_URL` | ✅ | `https://domain-kamu` — **tandai sebagai Build Variable** (di-inline ke bundle browser saat build) |
| `MIDTRANS_SERVER_KEY` | ⬜ | kunci Midtrans (kosong = mode simulasi) |
| `MIDTRANS_CLIENT_KEY` | ⬜ | kunci Midtrans |
| `MIDTRANS_IS_PRODUCTION` | ⬜ | `true` untuk produksi Midtrans, else `false` |
| `PORT` | ⬜ | `3000` (default) |

> Penting: `VITE_APP_URL` dipakai saat **build** (di-inline ke klien). Di Coolify,
> centang opsi **Build Variable** agar tersedia saat `npm run build`.

## 5. Deploy & seed
- Klik **Deploy**. Saat boot, migrasi DB jalan otomatis.
- Isi data demo **sekali**: buka `https://domain-kamu/api/seed`
  (mengisi user, treatment, booking, transaksi). Password demo semua: `ameris123`.

> 🔒 Produksi: `/api/seed` itu **dev convenience** (menghapus + mengisi ulang data).
> Setelah seed awal, sebaiknya **hapus/route-guard** `src/routes/api/seed.ts`,
> dan ganti `BETTER_AUTH_SECRET` ke nilai rahasia kuat.

## Midtrans webhook (jika pakai kunci asli)
Di dashboard Midtrans → Settings → Configuration → **Payment Notification URL**:
```
https://domain-kamu/api/midtrans/notification
```

## Catatan
- Image dibangun dengan `npm run build` (sudah diverifikasi sukses) → `node .output/server/index.mjs`.
- Healthcheck container memakai `GET /api/health`.
- Belum di-build sebagai image Docker secara lokal (mesin dev = macOS tanpa Docker);
  langkah build mengikuti build produksi yang sudah lolos.
