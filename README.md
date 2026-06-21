# Ameris Aesthetic Clinic — Self-Service Portal

Portal mandiri (self-service) untuk **Ameris Aesthetic Clinic** (by dr. Meriana, M.Kes (AAM), Gading Serpong).
Pasien bisa lihat katalog treatment, promo, booking online, dan kumpulkan poin **Ameris Privilege Club**;
owner punya console untuk jadwal, transaksi, kelola treatment, dan rekam medis (EMR).

Full-stack **TanStack Start** — frontend + backend (server functions) dalam satu app. UI Bahasa Indonesia.
Brand: cream/champagne/gold luxe · fonts Cormorant Garamond + Hanken Grotesk + Pinyon Script · `#RefineYourBeauty`.

---

## Menjalankan project

```bash
cd ~/Documents/Project
npm install      # hanya kalau node_modules belum ada
npm run dev      # → http://localhost:3000
```

Database lokal (PGlite) jalan otomatis, **tanpa setup eksternal**. Datanya persist di `./.data/ameris`.

**Kalau DB kosong** (clone baru / folder `.data/` terhapus), seed sekali:
buka `http://localhost:3000/api/seed` di browser (mengisi 9 user, 61 treatment, 10 booking, dst).

### Login (email + password)

Buka `/masuk` → masukkan **email + password**. Semua akun demo pakai password yang sama: **`ameris123`**.
Daftar akun baru lewat tab **Daftar** (email + password, otomatis role `pasien`).

| Peran | Email | Password | Diarahkan ke |
|-------|-------|----------|--------------|
| Owner | `owner@ameris.local` | `ameris123` | `/owner` |
| Dokter | `anya@ameris.local`, `rendra@ameris.local` | `ameris123` | `/dokter` |
| Pasien | `sarah.putri@email.com` (poin 14) | `ameris123` | `/akun` |
| Pasien | `andini.lestari@email.com`, `bunga.maharani@email.com`, … | `ameris123` | `/akun` |

---

## Tech stack

| Lapisan | Teknologi |
|---------|-----------|
| Framework | TanStack Start (React 19) + Vite, Nitro |
| Styling | Tailwind CSS v4 |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query (`useQuery`/`useMutation`) |
| API | TanStack Start **server functions** (`createServerFn`) |
| ORM | Drizzle ORM (Postgres dialect) |
| Database | **PGlite** (embedded Postgres lokal) — swap ke Neon/Supabase via `DATABASE_URL` |
| Auth | **Better Auth** — email + password, sessions, roles |
| Pembayaran | **Midtrans Snap** (REST langsung, tanpa SDK) — lihat [Pembayaran](#pembayaran-midtrans) |
| Validasi | Zod |

---

## Pembayaran (Midtrans)

Checkout **Bayar online** memakai **Midtrans Snap**. Alur: `createBooking` (status `Menunggu`,
transaksi `Pending`) → `createSnapPayment` buka sesi Snap → pasien bayar → status disinkronkan
ke DB (`Lunas`, booking otomatis `Dikonfirmasi`). **Bayar di klinik** (Offline) tetap seperti
sebelumnya (dilunasi owner saat datang).

**Tanpa kunci = mode simulasi.** Kalau `MIDTRANS_SERVER_KEY` kosong (default `.env`), checkout
menampilkan dialog **Midtrans Sandbox** in-app (Sukses / Pending / Batal) supaya alur full bisa
diuji tanpa kredensial — tidak ada transaksi asli. Pasien juga bisa melanjutkan pembayaran yang
tertunda dari **Booking saya → bukti janji temu → Bayar sekarang**.

**Pakai Midtrans Sandbox asli:**

1. Daftar di [dashboard.sandbox.midtrans.com](https://dashboard.sandbox.midtrans.com).
2. **Settings → Access Keys** → isi `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY` di `.env`.
3. **Settings → Configuration → Payment Notification URL** →
   `https://<host-publik>/api/midtrans/notification` (pakai ngrok saat dev).

Dengan kunci asli: popup Snap betulan + webhook (verifikasi tanda tangan SHA-512) yang
men-settle pembayaran. `confirmPayment` juga cek ulang status ke Midtrans saat callback sukses,
jadi DB tetap akurat walau webhook belum sampai. Untuk produksi, set `MIDTRANS_IS_PRODUCTION=true`.

**Seed:** `/api/seed` mengisi transaksi untuk **semua** booking, lengkap dengan field Midtrans
(`midtransOrderId`, `midtransStatus`, `paidAt`) — booking online yang lunas ditandai `settlement`.

File terkait: `server/_midtrans.ts` (helper server-only), `server/payments.ts` (server functions),
`routes/api/midtrans/notification.ts` (webhook), `lib/useMidtransPay.tsx` (Snap loader + dialog).

---

## Struktur

```
src/
  routes/                     # halaman (file-based routing)
    index.tsx                 #   landing page
    masuk.tsx                 #   login/daftar (email + password)
    treatment.index.tsx       #   menu treatment   (treatment.$id = detail)
    keranjang.tsx, booking.tsx#   cart + checkout (tanggal·jam·bayar)
    akun*.tsx                 #   dashboard pasien (ringkasan, booking, privilege, profil)
    owner*.tsx                #   owner console (dashboard, jadwal, treatment, transaksi, pasien+EMR, dokter)
    dokter*.tsx               #   konsol dokter (jadwal, pasien+EMR, profil + bagi hasil)
    api/auth/$.ts             #   mount handler Better Auth
    api/seed.ts               #   GET /api/seed → isi DB dari mock data (dev)
    api/midtrans/notification.ts # POST webhook Midtrans (verifikasi tanda tangan SHA-512)
  server/                     # API (server functions), server-only
    treatments, bookings, transactions, payments, loyalty, patients, account, dashboard, doctors
    _session.ts               #   requireUser / requireOwner / requireDoctor / requireStaff (guard role)
    _appointments.ts          #   helper DB bersama (JANGAN diimpor komponen client)
    _midtrans.ts              #   helper Midtrans server-only (Snap API · verifikasi · settle)
    seed.ts                   #   logika seeding
  db/                         # schema.ts, auth-schema.ts, index.ts (client), migrate.ts
  lib/                        # auth.ts, auth-client.ts, cart.tsx, useMidtransPay.tsx
  components/                 # landing/*, app/*, owner/*, clinic/* (ScheduleBoard·PatientsTable·PatientDetail dipakai owner+dokter)
  data/                       # clinic/account/owner — sumber seed + helper presentasi (statusTone, formatRp, dll)
drizzle/                      # file migrasi SQL (hasil drizzle-kit generate)
drizzle.config.ts · .env · .data/   (PGlite, di-gitignore)
```

---

## Scripts

```bash
npm run dev          # dev server (port 3000)
npm run build        # build produksi
npm run db:generate  # regenerasi migrasi SQL dari schema
npm run db:studio    # Drizzle Studio (lihat/edit DB)
```

---

## Status & roadmap

**Selesai:**
- ✅ Landing page (brand Ameris)
- ✅ Frontend pasien (menu, detail, cart, booking, dashboard, privilege, profil)
- ✅ Owner console (dashboard, jadwal, kelola treatment — harga·status·promo·**gambar** (URL/upload, ideal 1200×800 3:2), transaksi, pasien + EMR/before-after, kelola dokter)
- ✅ **Konsol Dokter** (role `dokter`) — akses terbatas: Jadwal + Pasien & EMR (bisa **tambah pasien baru** kalau nama tak ditemukan); profil "Bagi Hasil" menampilkan **treatment yang dikerjakan per hari + total bagi hasil per bulan** (rupiah saja, **tanpa %** — % diatur owner di `/owner/dokter`)
- ✅ Backend: database + auth (email + password) + semua API endpoint — frontend sudah tersambung penuh
- ✅ Payment gateway **Midtrans Snap** (mode simulasi tanpa kunci · webhook + verifikasi tanda tangan) — lihat [Pembayaran](#pembayaran-midtrans)

**Belum (di luar scope sekarang):**
- ⬜ Email verifikasi & reset password via provider asli (Resend/Fonnte) — sekarang verifikasi email dimatikan
- ⬜ Push notification (FCM/OneSignal) + cron promo ulang tahun
- 🟡 Deploy: **`Dockerfile` + panduan Coolify siap** ([DEPLOY.md](DEPLOY.md)) — tinggal jalankan di VPS Linux + set `DATABASE_URL` ke Postgres produksi

---

## Catatan dev penting (gotchas)

- **PGlite harus `ssr.external`** di `vite.config.ts` (sudah diset) agar WASM-nya jalan di server.
- **Jangan ekspor fungsi biasa yang memakai `db`** dari file yang diimpor komponen client → `db` (Node) bocor ke browser. Taruh di `src/server/_appointments.ts` (server-only).
- Status booking: `Menunggu → Dikonfirmasi → Hadir → Selesai` (atau `Batal`). Saat **Selesai**, otomatis +`floor(total/1.000.000)` poin (idempotent).
- Map `statusTone` di `data/account.ts` & `data/owner.ts` harus mencakup semua status termasuk `Hadir`.
- Tanggal: selalu bangun ISO dari komponen **lokal** (jangan `toISOString()` — bikin geser 1 hari).

---

## Lanjut di chat baru

Chat Claude Code baru otomatis memuat memory project ini, jadi konteksnya tetap nyambung.
Prompt pembuka yang disarankan:

> Lanjutkan project Ameris Aesthetic Clinic di `~/Documents/Project` (baca README.md & memory).
> Jalankan `npm run dev`, seed via `/api/seed` kalau perlu, login owner `owner@ameris.local` / password `ameris123`.
> [lalu jelaskan tugas berikutnya, mis. "pasang payment gateway Midtrans" / "deploy ke Neon"].

