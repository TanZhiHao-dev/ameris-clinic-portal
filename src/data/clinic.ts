// Ameris Aesthetic Clinic — treatment menu & loyalty data.
// Source: official "Menu Baru" price list + Ameris Privilege Club infographic.
// Note: harga belum termasuk promo/diskon · berlaku sesuai ketersediaan di klinik.

export const clinic = {
  name: 'Ameris Aesthetic Clinic',
  short: 'Ameris',
  by: 'by dr. Meriana, M.Kes (AAM)',
  location: 'Gading Serpong',
  tagline: 'Refine Your Beauty',
  hashtag: '#RefineYourBeauty',
  // Brand positioning "take line" — shown on the landing brand strip.
  brandExpert: '1st Mindful Beauty Expert',
  brandPillars: ['Designed for Holistic Aesthetic', 'Delivering Conscious Transformation'],
  motto: 'Because You Deserve the Best',
  mottoId: 'Karena Anda Istimewa Bagi Kami',
  since: '29 Januari 2026',
  whatsapp: '0822-2778-8876',
  whatsappRaw: '6282227788876',
  email: 'amerisclinicid@gmail.com',
  instagram: '@amerisclinic',
  instagramUrl: 'https://www.instagram.com/amerisclinic/',
  tiktok: '@amerisclinic_serpong',
  tiktokUrl: 'https://www.tiktok.com/@amerisclinic_serpong',
  // Lokasi klinik — Bolsena Square, kawasan Gading Serpong.
  address: {
    line1: 'Bolsena Square, Gading Serpong',
    line2: 'Curug Sangereng, Kec. Kelapa Dua',
    line3: 'Kabupaten Tangerang, Banten 15810',
    plusCode: 'PJP9+59W',
    full: 'Bolsena Square, Curug Sangereng, Kec. Kelapa Dua, Kabupaten Tangerang, Banten 15810',
    lat: -6.2645028,
    lng: 106.6184492,
    // Tautan share resmi Google Maps (buka di app / browser).
    mapsUrl: 'https://maps.app.goo.gl/g4WcQsZiihxaFdkEA',
    // Embed peta tanpa API key — endpoint /maps/embed resmi (frame-safe; URL
    // `?output=embed` lama kini redirect 301 + X-Frame-Options jadi diblokir
    // iframe). `pb` lengkap dgn Place ID klinik → pin berlabel "AMERIS
    // Aesthetic Clinic".
    mapsEmbed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.6!2d106.6184492!3d-6.2645028!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69fd0017816381%3A0xd0e161bafe5fd2a5!2sAMERIS%20Aesthetic%20Clinic!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid',
  },
  // Manual bank-transfer payment. qrisImage: drop the clinic's QRIS PNG at
  // public/qris.png (it auto-hides if the file is absent).
  bank: {
    bankName: 'BCA',
    accountNumber: '8833992188',
    accountHolder: 'AMERIS SUKSES ABADI PT',
    qrisImage: '/qris.png',
  },
}

export type Category =
  | 'Facial'
  | 'Peeling'
  | 'Laser'
  | 'Skinbooster'
  | 'Injeksi'
  | 'Paket'

export type Treatment = {
  id: string
  name: string
  blurb: string
  category: Category
  duration: string
  price: number
  /** When true, `price` is per unit (e.g. Botox) and shows as "Rp.../unit". */
  pricePerUnit?: boolean
  available: boolean
  bestSeller?: boolean
  /** The single treatment featured in the landing hero card (owner-controlled). */
  heroFeatured?: boolean
  /** Promo state from the DB (owner-managed). `promoPrice` < `price` activates
   *  the discount on the website; the cart/booking then charge `promoPrice`. */
  isPromo?: boolean
  promoPrice?: number | null
  /** Optional real photo (e.g. '/treatments/facial.jpg'). Falls back to an
   *  icon thumbnail when omitted. */
  image?: string
}

export const formatRp = (value: number) => 'Rp' + value.toLocaleString('id-ID')

// Ameris Privilege: 1 poin per kelipatan Rp1.000.000 belanja. Sisa di bawah
// 1 juta tidak terhitung (floor) — mis. 2.5jt → 2 poin, 0.8jt → 0 poin.
export const loyaltyPointsFor = (total: number) => Math.floor(Math.max(0, total) / 1_000_000)

// What the customer actually pays: the promo price when a treatment is on a
// valid promo, otherwise the regular price. Single source of truth for cart,
// price tags, and booking estimates.
export const effectivePrice = (t: { price: number; isPromo?: boolean; promoPrice?: number | null }) =>
  t.isPromo && t.promoPrice != null && t.promoPrice < t.price ? t.promoPrice : t.price

export const promoOffPct = (price: number, promoPrice: number) =>
  Math.round(((price - promoPrice) / price) * 100)

export const categories = [
  'Best Seller',
  'Facial',
  'Peeling',
  'Laser',
  'Skinbooster',
  'Injeksi',
  'Paket',
] as const

export const treatments: Treatment[] = [
  // ── Ameris Signature Facial ──
  { id: 'facial-basic', name: 'Ameris Basic Facial', blurb: 'Membersihkan kotoran, minyak & sel kulit mati — wajah lebih segar dan sehat.', category: 'Facial', duration: '90 min', price: 170_000, available: true, bestSeller: true, heroFeatured: true },
  { id: 'facial-acne', name: 'Acne Recovery Facial', blurb: 'Untuk kulit berjerawat — bersihkan pori mendalam dan redakan peradangan.', category: 'Facial', duration: '90 min', price: 370_000, available: true },
  { id: 'facial-platinum', name: 'Platinum Glow Facial', blurb: 'Facial premium untuk kulit lebih halus, cerah, lembap, dan glowing.', category: 'Facial', duration: '90 min', price: 370_000, available: true, bestSeller: true },
  { id: 'facial-diamond', name: 'Diamond Rejuvenation Facial', blurb: 'Microdermabrasi untuk angkat sel mati & regenerasi kulit lebih cerah.', category: 'Facial', duration: '30 min', price: 370_000, available: true },
  { id: 'facial-detox', name: 'Pure Skin Detox Facial', blurb: 'Teknologi ultrasound untuk penyerapan krim detox yang lebih optimal.', category: 'Facial', duration: '30 min', price: 470_000, available: true },
  { id: 'facial-lift', name: 'Lift & Glow Facial', blurb: 'Detox ultrasound — kulit terasa segar dan skin barrier terjaga.', category: 'Facial', duration: '30 min', price: 570_000, available: true },

  // ── Skin Renewal Peeling ──
  { id: 'peel-brightening', name: 'Brightening Peeling Face/Neck', blurb: 'Cerahkan dan ratakan kulit kusam agar lebih glowing.', category: 'Peeling', duration: '90 min', price: 250_000, available: true },
  { id: 'peel-acne', name: 'Acne Peeling Face/Neck', blurb: 'Atasi jerawat dan kulit berminyak agar lebih sehat dan kenyal.', category: 'Peeling', duration: '90 min', price: 250_000, available: true },
  { id: 'peel-rejuve', name: 'Rejuve Peeling Face/Neck', blurb: 'Anti-aging & regenerasi kulit untuk melawan tanda penuaan dini.', category: 'Peeling', duration: '90 min', price: 250_000, available: true },
  { id: 'peel-body', name: 'Peeling Body', blurb: 'Remajakan & ratakan warna kulit pada lengan/punggung/kaki.', category: 'Peeling', duration: '100 min', price: 450_000, available: true },

  // ── Korean Pico Glow Therapy ──
  { id: 'pico-lip', name: 'Lip Brightening Pico Laser', blurb: 'Cerahkan dan lembapkan bibir yang gelap atau kusam.', category: 'Laser', duration: '30 min', price: 550_000, available: true },
  { id: 'pico-blackdoll', name: 'Blackdoll Pico Laser', blurb: 'Masker karbon untuk bersihkan pori & efek kulit glowing seketika.', category: 'Laser', duration: '30 min', price: 850_000, available: true, bestSeller: true },
  { id: 'pico-pore', name: 'Pore Refining Picolaser', blurb: 'Kecilkan pori, kurangi minyak berlebih, samarkan bekas jerawat.', category: 'Laser', duration: '45 min', price: 950_000, available: true },
  { id: 'pico-rejuv', name: 'Skin Rejuvenation Picolaser', blurb: 'Remajakan kulit & rangsang kolagen agar tampak kenyal bercahaya.', category: 'Laser', duration: '45 min', price: 950_000, available: true },
  { id: 'pico-melasma', name: 'Melasma Pico Laser', blurb: 'Pudarkan melasma (flek hitam) dan ratakan pigmentasi kulit.', category: 'Laser', duration: '30 min', price: 1_000_000, available: true, bestSeller: true },
  { id: 'pico-ultimate', name: 'Pico Laser Ultimate Exosome', blurb: 'Kombinasi laser & exosome untuk peremajaan dan produksi kolagen.', category: 'Laser', duration: '60 min', price: 3_150_000, available: true },
  { id: 'pico-signature', name: 'Pico Laser Signature Exosome', blurb: 'Kurangi bekas luka & jerawat dengan laser + exosome mendalam.', category: 'Laser', duration: '60 min', price: 3_350_000, available: false },

  // ── DPL Photofacial ──
  { id: 'dpl-hair', name: 'DPL Hair Removal', blurb: 'Targetkan area wajah, ketiak, tangan, kaki untuk kulit bebas bulu.', category: 'Laser', duration: '20 min', price: 300_000, available: true },
  { id: 'dpl-pigmen', name: 'DPL Pigmen', blurb: 'Samarkan noda hitam atau flek ringan agar kulit lebih cerah.', category: 'Laser', duration: '20 min', price: 600_000, available: true },
  { id: 'dpl-acne', name: 'DPL Acne', blurb: 'Jinakkan jerawat membandel dan redakan kemerahan inflamasi.', category: 'Laser', duration: '20 min', price: 600_000, available: true },
  { id: 'dpl-rejuve', name: 'DPL Rejuve', blurb: 'Perbaiki tekstur kulit tak rata, jaga wajah tetap kencang.', category: 'Laser', duration: '20 min', price: 600_000, available: true },

  // ── Skin Booster & Injectables ──
  { id: 'sb-cell', name: 'Cell Booster Glow', blurb: 'Regenerasi kulit + produksi kolagen + perbaiki tekstur. 3cc.', category: 'Skinbooster', duration: '60 min', price: 2_000_000, available: true, bestSeller: true },
  { id: 'sb-jalupro', name: 'Jalupro Classic', blurb: 'Melembapkan + menyamarkan garis halus. 3cc.', category: 'Skinbooster', duration: '60 min', price: 2_000_000, available: true },
  { id: 'sb-nctf-eyes', name: 'NCTF Eyes & Lips', blurb: 'Haluskan garis halus + samarkan mata panda. 3cc.', category: 'Skinbooster', duration: '60 min', price: 2_500_000, available: true },
  { id: 'sb-nctf-135', name: 'NCTF 135HA', blurb: 'Ratakan tekstur + glow. 3cc.', category: 'Skinbooster', duration: '60 min', price: 2_500_000, available: true },
  { id: 'sb-rejuran-hb', name: 'Rejuran HB Plus', blurb: 'Perbaiki tekstur + glow. 3cc.', category: 'Skinbooster', duration: '60 min', price: 5_000_000, available: true, bestSeller: true },
  { id: 'sb-rejuran-healer', name: 'Rejuran Healer', blurb: 'Regenerasi & penyembuhan kulit. 3cc.', category: 'Skinbooster', duration: '60 min', price: 5_000_000, available: true },
  { id: 'sb-rejuran-scar', name: 'Rejuran Scar', blurb: 'Regenerasi & perbaikan sel kulit. 2cc.', category: 'Skinbooster', duration: '60 min', price: 4_500_000, available: true },
  { id: 'sb-juvelook', name: 'Juvelook Soft', blurb: 'Rangsang pembentukan kolagen + efek plumpy. 3cc.', category: 'Skinbooster', duration: '60 min', price: 3_500_000, available: true },
  { id: 'sb-nucleo-med', name: 'Nucleofill Medium', blurb: 'Hidrasi + regenerasi. 1.5cc.', category: 'Skinbooster', duration: '60 min', price: 4_000_000, available: true },
  { id: 'sb-nucleo-strong', name: 'Nucleofill Strong', blurb: 'Pengencangan + restrukturisasi. 1.5cc.', category: 'Skinbooster', duration: '60 min', price: 4_000_000, available: true },

  // ── Derma Renewal Therapy (Dermapen) ──
  { id: 'derma-bright', name: 'Derma Renewal Brightening', blurb: 'Efek cerah alami & pudarkan flek hitam dengan microneedling.', category: 'Skinbooster', duration: '40 min', price: 650_000, available: true },
  { id: 'derma-acne', name: 'Derma Renewal Acne', blurb: 'Redakan peradangan & kontrol minyak agar jerawat cepat sembuh.', category: 'Skinbooster', duration: '40 min', price: 650_000, available: true },
  { id: 'derma-hair', name: 'Derma Renewal Hair', blurb: 'Minimalkan kerontokan & rangsang pertumbuhan helai baru.', category: 'Skinbooster', duration: '40 min', price: 650_000, available: true },
  { id: 'derma-pdrn', name: 'Derma PDRN DNA Salmon', blurb: 'DNA Salmon untuk minimalkan kerutan & tanda penuaan dini.', category: 'Skinbooster', duration: '40 min', price: 1_000_000, available: true },
  { id: 'derma-plasma', name: 'Derma Renewal Plasma', blurb: 'Perbaiki kulit dari dalam & rangsang pembentukan kolagen.', category: 'Skinbooster', duration: '40 min', price: 1_000_000, available: true },
  { id: 'derma-exosome', name: 'Derma Renewal Exosome', blurb: 'Pembaruan sel kulit terdalam untuk hidrasi & elastisitas wajah.', category: 'Skinbooster', duration: '40 min', price: 2_800_000, available: true },

  // ── Exosome Rejuvenation System ──
  { id: 'exo-recovery', name: 'Exosome Cellular Recovery', blurb: 'Growth Factor & Exosome aktifkan regenerasi alami kulit.', category: 'Skinbooster', duration: '60 min', price: 1_500_000, available: true },
  { id: 'exo-radiance', name: 'Exosome Radiance Renewal', blurb: 'Perbaikan kulit mendalam, tingkatkan elastisitas & tekstur.', category: 'Skinbooster', duration: '60 min', price: 2_300_000, available: true },
  { id: 'exo-biocell', name: 'Exosome Biocell Rejuvenation', blurb: 'Exosome premium untuk peremajaan kulit tingkat lanjut.', category: 'Skinbooster', duration: '60 min', price: 2_550_000, available: false },

  // ── Injectables Rejuvenation & Correction ──
  { id: 'botox-korea', name: 'Botox Korea', blurb: 'Kurangi kerutan dinamis & garis ekspresi. Harga per unit.', category: 'Injeksi', duration: '60 min', price: 45_000, pricePerUnit: true, available: true, bestSeller: true },
  { id: 'botox-us', name: 'Botox US/Europe', blurb: 'Kurangi kerutan dinamis & garis ekspresi. Harga per unit.', category: 'Injeksi', duration: '60 min', price: 80_000, pricePerUnit: true, available: true },
  { id: 'microbotox-korea', name: 'Microbotox Korea', blurb: 'Segarkan kulit, kecilkan pori, atur minyak. Mulai dari.', category: 'Injeksi', duration: '60 min', price: 800_000, available: true },
  { id: 'microbotox-us', name: 'Microbotox US/Europe', blurb: 'Segarkan kulit & kerutan tampak natural. Mulai dari.', category: 'Injeksi', duration: '60 min', price: 1_000_000, available: true },
  { id: 'filler', name: 'Filler', blurb: 'Isi & pertegas kontur wajah: pipi, bibir, dagu, bawah mata. Mulai dari.', category: 'Injeksi', duration: '60 min', price: 2_000_000, available: true, bestSeller: true },
  { id: 'acne-injection', name: 'Acne/Keloid Injection', blurb: 'Percepat pemulihan jerawat & minimalkan noda. Mulai dari.', category: 'Injeksi', duration: '10 min', price: 100_000, available: true },

  // ── Vital Skin Boost IV Drip ──
  { id: 'iv-basic-inj', name: 'Glow Basic Injection', blurb: 'Tingkatkan energi & daya tahan tubuh, cocok untuk pemula.', category: 'Injeksi', duration: '60 min', price: 350_000, available: true },
  { id: 'iv-basic-inf', name: 'Glow Basic Infusion', blurb: 'Cerahkan kulit kusam & jaga kesehatan tubuh.', category: 'Injeksi', duration: '60 min', price: 550_000, available: true },
  { id: 'iv-advanced', name: 'Glow Advanced Infusion', blurb: 'Efek pencerahan intens & ratakan warna kulit belang.', category: 'Injeksi', duration: '60 min', price: 1_000_000, available: true },
  { id: 'iv-premium', name: 'Premium Glow Ultimate Infusion', blurb: 'Anti-aging intensif, percepat regenerasi kulit.', category: 'Injeksi', duration: '90 min', price: 1_500_000, available: true },

  // ── Mesotherapy ──
  { id: 'meso-melasma', name: 'Meso Melasma', blurb: 'Cerahkan kulit kusam & samarkan noda hitam.', category: 'Injeksi', duration: '45 min', price: 550_000, available: true },
  { id: 'meso-aging', name: 'Meso Anti Aging', blurb: 'Kembalikan elastisitas — kulit terasa lebih kencang & sehat.', category: 'Injeksi', duration: '45 min', price: 550_000, available: true },
  { id: 'meso-hair', name: 'Meso Hair', blurb: 'Atasi kerontokan & stimulasi pertumbuhan rambut baru.', category: 'Injeksi', duration: '45 min', price: 550_000, available: true },
  { id: 'meso-lipo-v', name: 'Meso Lipo V Shape', blurb: 'Kurangi lemak wajah (double chin) & bentuk kontur tirus. Mulai dari.', category: 'Injeksi', duration: '45 min', price: 250_000, available: true },

  // ── Jet Peel Diamond Therapy ──
  { id: 'jet-acne', name: 'Diamond Jet Peel Oxy Acne', blurb: 'Hydro-dermabrasion untuk kulit berjerawat lebih bersih.', category: 'Facial', duration: '20 min', price: 660_000, available: true },
  { id: 'jet-brightening', name: 'Diamond Jet Peel Oxy Brightening', blurb: 'Angkat kulit kendur & beri hidrasi mendalam, wajah lebih kenyal.', category: 'Facial', duration: '20 min', price: 660_000, available: true },

  // ── Treatment Packages ──
  { id: 'pkg-hydra-ess', name: 'Hydra Renewal Essensial', blurb: 'Platinum Glow Facial + PDT Red Light + Jet Peel Oxy Brightening.', category: 'Paket', duration: '120 min', price: 450_000, available: true },
  { id: 'pkg-hydra-sig', name: 'Hydra Renewal Signature', blurb: '+ Dermapen Nano Hydra Skinbooster untuk tekstur & glow.', category: 'Paket', duration: '140 min', price: 1_230_000, available: true, bestSeller: true },
  { id: 'pkg-hydra-prem', name: 'Hydra Renewal Premium', blurb: '+ Glass Skin Hyalo Skinbooster & Biostimulator kolagen.', category: 'Paket', duration: '180 min', price: 3_500_000, available: true },
  { id: 'pkg-youth-ess', name: 'Youth Lift Essential', blurb: 'Platinum Glow Facial + PDT Redlight + RF Skin Lifting.', category: 'Paket', duration: '90 min', price: 800_000, available: true },
  { id: 'pkg-youth-rad', name: 'Youth Lift Radiance', blurb: '+ DPL Photofacial Rejuvenation untuk kulit cerah & kencang.', category: 'Paket', duration: '120 min', price: 1_350_000, available: true },
]

// Promo mingguan — paket dengan harga spesial (harga coret resmi dari menu)
export type Promo = {
  name: string
  detail: string
  was: number
  now: number
}

export const weeklyPromos: Promo[] = [
  { name: 'Hydra Renewal Premium', detail: 'Facial + PDT + Jet Peel + Glass Skin Skinbooster', was: 4_700_000, now: 3_500_000 },
  { name: 'Hydra Renewal Signature', detail: 'Facial + PDT + Jet Peel + Dermapen Nano Hydra', was: 1_500_000, now: 1_230_000 },
  { name: 'Youth Lift Essential', detail: 'Platinum Glow Facial + PDT Redlight + RF Lifting', was: 900_000, now: 800_000 },
]

export const offPct = (p: Promo) => Math.round(((p.was - p.now) / p.was) * 100)

export const bookingSteps = [
  { n: '01', title: 'Pilih treatment', body: 'Telusuri menu lengkap, cek harga & estimasi durasi, simpan ke keranjang.' },
  { n: '02', title: 'Atur jadwal', body: 'Pilih tanggal & jam langsung dari slot klinik Gading Serpong yang kosong.' },
  { n: '03', title: 'Pilih pembayaran', body: 'Bayar online via QRIS/transfer, atau pilih bayar langsung di klinik.' },
  { n: '04', title: 'Datang & bersinar', body: 'Tunjukkan bukti booking, nikmati perawatan, poin Privilege masuk otomatis.' },
]

// Ameris Privilege Club — tukar poin dengan treatment gratis
export const redeemTiers = [
  { point: 1, name: 'Ameris Basic Facial' },
  { point: 2, name: 'Jetpeel Diamond Facial' },
  { point: 3, name: 'Peeling Brightening / Acne' },
  { point: 4, name: 'Ameris Signature Back Treatment' },
  { point: 5, name: 'Vitamin Bright Injection' },
  { point: 6, name: 'DPL Underarm Treatment' },
  { point: 7, name: 'Pico Blackdoll Treatment' },
  { point: 8, name: 'PRP Scar Treatment' },
  { point: 9, name: 'Pico Rejuvenation Laser' },
  { point: 10, name: 'Derma Hair Booster Treatment' },
  { point: 11, name: 'Baby Skinbooster Dermapen' },
  { point: 12, name: 'Melasma Skinbooster Treatment' },
  { point: 13, name: 'Dermapen DNA Salmon Booster' },
  { point: 14, name: 'PDRN DNA Salmon Skinbooster' },
  { point: 15, name: 'Microbotox Pore' },
  { point: 16, name: 'Melasma Peeling + Skinbooster Melasma' },
  { point: 17, name: 'Rejuner Collagen Stimulator 1cc' },
  { point: 18, name: 'Exosome Skinbooster Treatment' },
  { point: 20, name: 'Juvelook Collagen Stimulator 2cc Fullface' },
]

export const privilegeBenefits = [
  'Kumpulkan poin di setiap transaksi',
  'Tukarkan poin dengan treatment gratis',
  'Berlaku untuk seluruh pasien Ameris',
  'Info promo & event eksklusif',
  'Pengalaman treatment yang lebih spesial',
]

export const valueProps = [
  { title: 'Akses 24/7', body: 'Lihat slot & booking kapan saja, tanpa menunggu balasan admin.', icon: 'clock' },
  { title: 'Dua cara bayar', body: 'Bayar online via QRIS/transfer, atau langsung di klinik.', icon: 'wallet' },
  { title: 'Rekam medis digital', body: 'Riwayat treatment & catatan dokter tersimpan rapi tiap kunjungan.', icon: 'file' },
  { title: 'Pengingat otomatis', body: 'Notifikasi jadwal & promo spesial langsung ke ponselmu.', icon: 'bell' },
] as const

// ── Testimoni / ulasan Google ───────────────────────────────────────────────
// `googleReview` = ringkasan listing Google (owner update angka rating & jumlah
// ulasan sesuai Google Business). `url` membuka halaman ulasan klinik di Google
// Maps. `testimonials` = ulasan asli dari Google Maps, salin dari screenshot.
export const googleReview = {
  url: 'https://www.google.com/maps/place/AMERIS+Aesthetic+Clinic/@-6.2645028,106.6158743,17z/data=!4m8!3m7!1s0x2e69fd0017816381:0xd0e161bafe5fd2a5!8m2!3d-6.2645028!4d106.6184492!9m1!1b1!16s%2Fg%2F11yyxkq368?entry=ttu&g_ep=EgoyMDI2MDYyMy4wIKXMDSoASAFQAw%3D%3D',
  rating: 5.0,
  count: 5, // jumlah ulasan di Google — update sesuai listing
}

export type Testimonial = {
  name: string
  role: string
  rating: number // 1..5
  title: string
  body: string
  photo?: string // path ke file di public/, misal '/testimonials/virgilia.jpg'
}

export const testimonials: Testimonial[] = [
  {
    name: 'Fitri E.',
    role: 'Local Guide · 12 ulasan',
    rating: 5,
    title: 'Lokasi mudah, dokter ramah & cantik!',
    body: 'Lokasi kliniknya gampang dicari, ruangan nyaman dan bersih, dokternya ramah plus cantik. Pasti jadi pasien tetap nih!',
    photo: '/testimonials/fitri.jpg',
  },
  {
    name: 'Virgilia S.',
    role: 'Pasien Juvelook Cannula',
    rating: 5,
    title: 'Dokter sangat berpengalaman & ramah!',
    body: 'Pertama kali dateng, dokter nya super ramah, penjelasan sangat bermanfaat dan rinci. Treatment juvelook dengan teknik cannula — amaze banget sama hasilnya. Tempatnya bersih, wangi, rapih dan nyaman sekali.',
    photo: '/testimonials/virgilia.jpg',
  },
  {
    name: 'Voranica C.',
    role: 'Pasien Ameris',
    rating: 5,
    title: 'Komunikatif, bersih, harga oke!',
    body: 'Dokternya komunikatif banget, tempatnya bersih dan nyaman, pelayanannya juga ok bangett! Harganya jugaaa ok banget!',
    photo: '/testimonials/voranica.jpg',
  },
  {
    name: 'Mega',
    role: 'Pasien Setia Ameris',
    rating: 5,
    title: 'Pelayanan terbaik & harga affordable!',
    body: 'Klinik kecantikan dengan pelayanan terbaik yang pernah aku kunjungi. Pelayanannya memang oke banget, harga affordable, konsultasi dokter gratis. Pokoknya bakal langganan treatment disini!',
    photo: '/testimonials/mega.jpg',
  },
  {
    name: 'Annisa K.',
    role: 'Pasien Facial',
    rating: 5,
    title: 'Facial gak sakit, semua ramah!',
    body: 'Good service! Facial nya gak sakit, dokternya ramah, receptionnya ramah, tempatnya bersih. Oke banget!',
    photo: '/testimonials/annisa.jpg',
  },
] as const
