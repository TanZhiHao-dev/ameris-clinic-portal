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

## 2. Database Postgres (permanen)
Di **project Coolify yang sama** dengan aplikasi: **+ New → Database → PostgreSQL**.
- Coolify otomatis menaruh datanya di **persistent volume** → data tetap ada walau
  aplikasi di-redeploy (inilah yang bikin DB permanen, beda dari PGlite ephemeral).
- Buka resource Postgres → tab **Connection** → salin **Internal/Postgres URL**.
  Bentuknya: `postgres://postgres:PASSWORD@<service-name>:5432/postgres`
  (host = nama service Postgres di jaringan internal Coolify, **tanpa SSL**).
  Pakai URL **internal** ini untuk `DATABASE_URL` — jangan yang publik.
- **Start Postgres dulu** sampai healthy sebelum deploy aplikasi. Aplikasi
  menjalankan migrasi saat boot; kalau DB belum siap, container restart sampai
  DB up (aman, tapi lebih mulus kalau DB duluan).

Migrasi Drizzle dijalankan **otomatis saat container boot** (`drizzle/` di-bundle
ke image), jadi skema tabel langsung terbentuk di Postgres baru.

## 3. Buat aplikasi dari repo
- **+ New → Application → Private Repository (GitHub App)** → pilih
  `TanZhiHao-dev/ameris-clinic-portal`, branch `main`.
- **Build Pack: Dockerfile** (Coolify mendeteksi `Dockerfile` di root).
- **Port: 3000**. Set domain + aktifkan HTTPS (Let's Encrypt).

## 4. Environment Variables
Set di Coolify (tab Environment Variables):

| Variable | Wajib | Nilai |
|----------|:----:|-------|
| `DATABASE_URL` | ✅ | **Internal** URL Postgres dari langkah 2 (mengaktifkan Postgres permanen; kosong = PGlite ephemeral) |
| `BETTER_AUTH_SECRET` | ✅ | string acak panjang → `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | ✅ | `https://domain-kamu` (URL publik final) |
| `VITE_APP_URL` | ✅ | `https://domain-kamu` — **tandai sebagai Build Variable** (di-inline ke bundle browser saat build) |
| `SEED_TOKEN` | ⬜ | token rahasia untuk membuka `/api/seed` sekali di produksi → `openssl rand -hex 16`. Tanpa ini, seeding ditolak di produksi |
| `MIDTRANS_SERVER_KEY` | ⬜ | kunci Midtrans (kosong = mode simulasi) |
| `MIDTRANS_CLIENT_KEY` | ⬜ | kunci Midtrans |
| `MIDTRANS_IS_PRODUCTION` | ⬜ | `true` untuk produksi Midtrans, else `false` |
| `PORT` | ⬜ | `3000` (default) |

> Penting: `VITE_APP_URL` dipakai saat **build** (di-inline ke klien). Di Coolify,
> centang opsi **Build Variable** agar tersedia saat `npm run build`.

## 5. Deploy & seed
- Klik **Deploy**. Saat boot, migrasi DB jalan otomatis → tabel terbentuk di Postgres.
- **Verifikasi DB permanen**: buka `https://domain-kamu/api/health` → harus
  `{"ok":true,"db":"postgres",...}`. Kalau `"db":"pglite"`, berarti `DATABASE_URL`
  belum kebaca — cek env & redeploy.
- Isi data demo **sekali** (butuh `SEED_TOKEN` dari langkah 4):
  `https://domain-kamu/api/seed?token=<SEED_TOKEN>`
  (mengisi user, treatment, booking, transaksi). Password demo semua: `ameris123`.

> 🔒 Produksi: `/api/seed` itu **destruktif** (menghapus + mengisi ulang SEMUA data).
> Route sudah di-guard: tanpa `SEED_TOKEN` yang cocok, request ditolak (`401`),
> dan tanpa `SEED_TOKEN` di-set sama sekali, seeding ditolak di produksi (`403`).
> Setelah seed awal selesai, **hapus `SEED_TOKEN`** dari Coolify agar route
> benar-benar tertutup. Pastikan juga `BETTER_AUTH_SECRET` bernilai rahasia kuat.

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
