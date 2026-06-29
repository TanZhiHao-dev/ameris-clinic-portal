// Central translation dictionary for the customer-facing site (ID + EN).
// Owner/staff dashboards stay Indonesian. Keys are grouped by area. Use
// `{placeholders}` for runtime values — see t(key, vars) in i18n.tsx.
//
// Product/clinical content (treatment names, promo combos, real Google reviews)
// is intentionally NOT translated — those stay in their original form.

const dict = {
  // ── Common / buttons ──────────────────────────────────────────────
  'common.bookNow': { id: 'Booking sekarang', en: 'Book now' },
  'common.viewTreatments': { id: 'Lihat treatment', en: 'View treatments' },
  'common.available': { id: 'Tersedia', en: 'Available' },
  'common.unavailable': { id: 'Tidak tersedia', en: 'Unavailable' },
  'common.selectSchedule': { id: 'Pilih jadwal', en: 'Choose schedule' },
  'common.save': { id: 'HEMAT', en: 'SAVE' },
  'cart.add': { id: 'Keranjang', en: 'Add to cart' },
  'cart.added': { id: 'Ditambahkan', en: 'Added' },
  'cart.addAria': { id: 'Tambah {name} ke keranjang', en: 'Add {name} to cart' },

  // ── Language toggle ───────────────────────────────────────────────
  'lang.aria': { id: 'Ganti bahasa', en: 'Change language' },

  // ── Nav / header ──────────────────────────────────────────────────
  'nav.home': { id: 'Beranda', en: 'Home' },
  'nav.treatment': { id: 'Treatment', en: 'Treatments' },
  'nav.promo': { id: 'Promo', en: 'Promos' },
  'nav.howItWorks': { id: 'Cara Kerja', en: 'How It Works' },
  'nav.privilege': { id: 'Privilege Club', en: 'Privilege Club' },
  'header.dashboard': { id: 'Dashboard', en: 'Dashboard' },
  'header.myAccount': { id: 'Akun saya', en: 'My account' },
  'header.account': { id: 'Akun', en: 'Account' },
  'header.login': { id: 'Masuk', en: 'Sign in' },
  'header.register': { id: 'Daftar', en: 'Sign up' },
  'header.logout': { id: 'Keluar', en: 'Sign out' },
  'header.cartAria': { id: 'Keranjang', en: 'Cart' },
  'header.openMenu': { id: 'Buka menu', en: 'Open menu' },
  'header.closeMenu': { id: 'Tutup menu', en: 'Close menu' },

  // ── Announcement ticker ───────────────────────────────────────────
  'ticker.1': {
    id: 'Promo Hydra Renewal Premium — hemat Rp1.200.000',
    en: 'Hydra Renewal Premium promo — save Rp1,200,000',
  },
  'ticker.2': {
    id: 'Setiap transaksi Rp1.000.000 = 1 poin Privilege',
    en: 'Every Rp1,000,000 spent = 1 Privilege point',
  },
  'ticker.3': {
    id: 'Best Seller: Korean Pico Glow Therapy',
    en: 'Best Seller: Korean Pico Glow Therapy',
  },
  'ticker.4': {
    id: 'Gratis konsultasi kulit untuk pasien baru',
    en: 'Free skin consultation for new patients',
  },

  // ── Hero ──────────────────────────────────────────────────────────
  'hero.titleLine1': { id: 'Refine your beauty,', en: 'Refine your beauty,' },
  'hero.titleAccent': { id: 'tampil percaya diri', en: 'feel confident' },
  'hero.titleLine3': { id: 'mulai hari ini.', en: 'starting today.' },
  'hero.desc': {
    id: 'Portal mandiri Ameris — lihat menu treatment, cek slot kosong, dan booking sendiri tanpa antre chat. Bayar online atau di klinik, dan kumpulkan poin Privilege di tiap perawatan.',
    en: "Ameris' self-service portal — browse the treatment menu, check open slots, and book yourself with no chat queue. Pay online or at the clinic, and earn Privilege points on every treatment.",
  },
  'hero.stat.booking': { id: 'Booking mandiri', en: 'Self-service booking' },
  'hero.stat.treatment': { id: 'Pilihan treatment', en: 'Treatment options' },
  'hero.stat.rating': { id: 'Rating pasien', en: 'Patient rating' },
  'hero.stat.tech': { id: 'Korean technology', en: 'Korean technology' },

  // ── Catalog ───────────────────────────────────────────────────────
  'catalog.eyebrow': { id: 'Menu Treatment', en: 'Treatment Menu' },
  'catalog.title1': { id: 'Semua perawatan,', en: 'Every treatment,' },
  'catalog.titleAccent': { id: 'harga & durasinya', en: 'price & duration' },
  'catalog.title3': { id: '— transparan.', en: '— fully transparent.' },
  'catalog.desc': {
    id: 'Dari facial hingga laser, skinbooster, dan paket signature. Label status diperbarui langsung oleh klinik.',
    en: 'From facials to laser, skinboosters, and signature packages. Availability is updated directly by the clinic.',
  },
  'catalog.note': {
    id: '*Harga belum termasuk promo/diskon · berlaku sesuai ketersediaan di klinik.',
    en: '*Prices exclude promos/discounts · subject to clinic availability.',
  },
  'cat.Best Seller': { id: 'Best Seller', en: 'Best Seller' },
  'cat.Facial': { id: 'Facial', en: 'Facial' },
  'cat.Peeling': { id: 'Peeling', en: 'Peeling' },
  'cat.Laser': { id: 'Laser', en: 'Laser' },
  'cat.Skinbooster': { id: 'Skinbooster', en: 'Skinbooster' },
  'cat.Injeksi': { id: 'Injeksi', en: 'Injection' },
  'cat.Paket': { id: 'Paket', en: 'Package' },

  // ── Promo ─────────────────────────────────────────────────────────
  'promo.eyebrow': { id: 'Promo Paket Spesial', en: 'Special Package Promos' },
  'promo.title1': { id: 'Paket signature,', en: 'Signature packages,' },
  'promo.titleAccent': { id: 'harga spesial', en: 'special prices' },
  'promo.badgeDuration': { id: 'Berlaku selama promo', en: 'While the promo lasts' },
  'promo.take': { id: 'Ambil promo ini', en: 'Get this promo' },

  // ── How it works ──────────────────────────────────────────────────
  'how.eyebrow': { id: 'Cara Kerja', en: 'How It Works' },
  'how.title1': { id: 'Dari pilih treatment sampai', en: 'From picking a treatment to' },
  'how.titleAccent': { id: 'bersinar', en: 'glowing' },
  'how.title3': { id: '— empat langkah.', en: '— in four steps.' },
  'step.01.title': { id: 'Pilih treatment', en: 'Pick a treatment' },
  'step.01.body': {
    id: 'Telusuri menu lengkap, cek harga & estimasi durasi, simpan ke keranjang.',
    en: 'Browse the full menu, check prices & estimated duration, add to cart.',
  },
  'step.02.title': { id: 'Atur jadwal', en: 'Set a schedule' },
  'step.02.body': {
    id: 'Pilih tanggal & jam langsung dari slot klinik Gading Serpong yang kosong.',
    en: 'Pick a date & time straight from the open slots at the Gading Serpong clinic.',
  },
  'step.03.title': { id: 'Pilih pembayaran', en: 'Choose payment' },
  'step.03.body': {
    id: 'Bayar online via QRIS/transfer, atau pilih bayar langsung di klinik.',
    en: 'Pay online via QRIS/bank transfer, or choose to pay at the clinic.',
  },
  'step.04.title': { id: 'Datang & bersinar', en: 'Come in & glow' },
  'step.04.body': {
    id: 'Tunjukkan bukti booking, nikmati perawatan, poin Privilege masuk otomatis.',
    en: 'Show your booking, enjoy the treatment, Privilege points are added automatically.',
  },

  // ── Loyalty / Privilege ───────────────────────────────────────────
  'loyalty.desc1': { id: 'Setiap transaksi ', en: 'Every ' },
  'loyalty.descStrong': { id: 'Rp1.000.000 = 1 poin', en: 'Rp1,000,000 = 1 point' },
  'loyalty.desc2': {
    id: '. Kumpulkan dan tukarkan dengan treatment favoritmu secara gratis.',
    en: ' spent. Collect and redeem them for your favourite treatments for free.',
  },
  'loyalty.pointsLabel': { id: 'Poin Privilege', en: 'Privilege Points' },
  'loyalty.redeemTitle': {
    id: 'Tukarkan poin dengan treatment gratis',
    en: 'Redeem points for free treatments',
  },
  'loyalty.note': {
    id: 'Penukaran mengikuti nilai poin masing-masing treatment, tanpa batas akumulasi poin.',
    en: 'Redemption follows each treatment’s point value, with no cap on points you can accumulate.',
  },
  'privilege.benefit.1': {
    id: 'Kumpulkan poin di setiap transaksi',
    en: 'Earn points on every transaction',
  },
  'privilege.benefit.2': {
    id: 'Tukarkan poin dengan treatment gratis',
    en: 'Redeem points for free treatments',
  },
  'privilege.benefit.3': {
    id: 'Berlaku untuk seluruh pasien Ameris',
    en: 'Available to all Ameris patients',
  },
  'privilege.benefit.4': {
    id: 'Info promo & event eksklusif',
    en: 'Exclusive promo & event updates',
  },
  'privilege.benefit.5': {
    id: 'Pengalaman treatment yang lebih spesial',
    en: 'A more special treatment experience',
  },

  // ── Value props ───────────────────────────────────────────────────
  'value.eyebrow': { id: 'Kenapa Ameris', en: 'Why Ameris' },
  'value.title1': { id: 'Portal mandiri yang', en: 'A self-service portal that' },
  'value.titleAccent': { id: 'mengurus detailnya', en: 'handles the details' },
  'value.title3': { id: 'untukmu.', en: 'for you.' },
  'value.clock.title': { id: 'Akses 24/7', en: '24/7 access' },
  'value.clock.body': {
    id: 'Lihat slot & booking kapan saja, tanpa menunggu balasan admin.',
    en: 'Check slots & book anytime, no waiting for an admin reply.',
  },
  'value.wallet.title': { id: 'Dua cara bayar', en: 'Two ways to pay' },
  'value.wallet.body': {
    id: 'Bayar online via QRIS/transfer, atau langsung di klinik.',
    en: 'Pay online via QRIS/bank transfer, or at the clinic.',
  },
  'value.file.title': { id: 'Rekam medis digital', en: 'Digital medical records' },
  'value.file.body': {
    id: 'Riwayat treatment & catatan dokter tersimpan rapi tiap kunjungan.',
    en: 'Treatment history & doctor’s notes stored neatly every visit.',
  },
  'value.bell.title': { id: 'Pengingat otomatis', en: 'Automatic reminders' },
  'value.bell.body': {
    id: 'Notifikasi jadwal & promo spesial langsung ke ponselmu.',
    en: 'Schedule & special-promo notifications straight to your phone.',
  },

  // ── Testimonials ──────────────────────────────────────────────────
  'testi.eyebrow': { id: 'Cerita Pelanggan', en: 'Client Love' },
  'testi.title1': { id: 'Kata mereka yang', en: 'Words that make' },
  'testi.titleAccent': { id: 'bikin kami berseri', en: 'us glow' },
  'testi.subtitle': {
    id: 'Cerita nyata, perawatan penuh perhatian, dan transformasi kulit yang lebih dari sekadar di permukaan.',
    en: 'Real stories, thoughtful care, and skin transformations that go deeper than the surface.',
  },
  'testi.statHeading': { id: 'Kebahagiaan pasien, terukur di tiap momen', en: 'Client happiness, measured in moments' },
  'testi.avgLabel': { id: 'Rating rata-rata', en: 'Average rating' },
  'testi.statBody': {
    id: 'Berdasarkan pengalaman pasien terverifikasi — dari konsultasi, perawatan, hingga follow-up.',
    en: 'Based on verified client experiences across consultations, treatments, and follow-up care.',
  },
  'testi.verified': { id: 'Kunjungan terverifikasi', en: 'Verified appointment' },
  'testi.bookCta': { id: 'Booking sesi glow', en: 'Book your glow session' },
  'testi.moreStories': { id: 'Lihat ulasan lain', en: 'Read more stories' },
  'testi.googleCount': { id: '· {count} ulasan dari Google', en: '· {count} reviews from Google' },
  'testi.googleFallback': { id: '· ulasan di Google', en: '· reviews on Google' },
  'testi.viaGoogle': { id: 'via Google', en: 'via Google' },

  // ── Final CTA ─────────────────────────────────────────────────────
  'cta.title1': { id: 'Kamu adalah mahakarya.', en: 'You are a masterpiece.' },
  'cta.titleAccent': { id: 'Saatnya bersinar.', en: 'Time to shine.' },
  'cta.desc': {
    id: 'Daftar pakai WhatsApp atau email — verifikasi OTP, langsung bisa pesan jadwal di {location}. {hashtag}',
    en: 'Sign up with WhatsApp or email — verify with OTP and book a slot at {location} right away. {hashtag}',
  },
  'cta.registerFree': { id: 'Daftar gratis', en: 'Sign up free' },

  // ── Footer ────────────────────────────────────────────────────────
  'footer.tagline': {
    id: 'Estetika yang terarah, presisi, dan berorientasi pada hasil — di {location}.',
    en: 'Focused, precise, results-driven aesthetics — in {location}.',
  },
  'footer.col.treatment': { id: 'Treatment', en: 'Treatments' },
  'footer.col.account': { id: 'Akun', en: 'Account' },
  'footer.col.clinic': { id: 'Klinik', en: 'Clinic' },
  'footer.link.facialPeeling': { id: 'Facial & Peeling', en: 'Facial & Peeling' },
  'footer.link.picoLaser': { id: 'Korean Pico Laser', en: 'Korean Pico Laser' },
  'footer.link.skinbooster': { id: 'Skinbooster', en: 'Skinbooster' },
  'footer.link.injeksiBotox': { id: 'Injeksi & Botox', en: 'Injection & Botox' },
  'footer.link.paketSignature': { id: 'Paket Signature', en: 'Signature Packages' },
  'footer.link.loginRegister': { id: 'Masuk / Daftar', en: 'Sign in / Sign up' },
  'footer.link.cart': { id: 'Keranjang', en: 'Cart' },
  'footer.link.privilege': { id: 'Privilege Club', en: 'Privilege Club' },
  'footer.link.bookingHistory': { id: 'Riwayat booking', en: 'Booking history' },
  'footer.link.about': { id: 'Tentang Ameris', en: 'About Ameris' },
  'footer.link.hours': { id: 'Jam operasional', en: 'Opening hours' },
  'footer.link.location': { id: 'Lokasi Gading Serpong', en: 'Gading Serpong location' },
  'footer.link.privacy': { id: 'Kebijakan privasi', en: 'Privacy policy' },
  'footer.address.title': { id: 'Kunjungi klinik', en: 'Visit our clinic' },
  'footer.address.directions': { id: 'Buka di Google Maps', en: 'Open in Google Maps' },
  'footer.address.mapTitle': { id: 'Peta lokasi Ameris Aesthetic Clinic', en: 'Map of Ameris Aesthetic Clinic' },

  // ── Treatments page (/treatment) ──────────────────────────────────
  'cart.addLong': { id: 'Tambah ke keranjang', en: 'Add to cart' },
  'cat.Semua': { id: 'Semua', en: 'All' },
  'tm.title1': { id: 'Pilih perawatan', en: 'Choose your' },
  'tm.titleAccent': { id: 'terbaikmu', en: 'best treatment' },
  'tm.desc': {
    id: 'Semua treatment Ameris lengkap dengan harga, durasi, dan status ketersediaan.',
    en: 'Every Ameris treatment with its price, duration, and availability.',
  },
  'tm.searchPlaceholder': { id: 'Cari treatment…', en: 'Search treatments…' },
  'tm.found': { id: '{count} treatment ditemukan', en: '{count} treatments found' },
  'tm.noneTitle': { id: 'Treatment tidak ditemukan', en: 'No treatments found' },
  'tm.noneBody': {
    id: 'Coba kata kunci atau kategori lain.',
    en: 'Try a different keyword or category.',
  },

  // ── Treatment detail (/treatment/$id) ─────────────────────────────
  'td.backToMenu': { id: 'Kembali ke menu', en: 'Back to menu' },
  'td.pricePromo': { id: 'Harga promo', en: 'Promo price' },
  'td.priceFrom': { id: 'Harga mulai', en: 'Starting price' },
  'td.priceWithDiscount': {
    id: 'Harga sudah termasuk diskon promo.',
    en: 'Price already includes the promo discount.',
  },
  'td.priceExcl': { id: '*Belum termasuk promo/diskon', en: '*Excludes promos/discounts' },
  'td.bullet1': {
    id: 'Ditangani oleh tenaga profesional bersertifikat',
    en: 'Handled by certified professionals',
  },
  'td.bullet2': {
    id: 'Konsultasi kondisi kulit sebelum treatment',
    en: 'Skin-condition consultation before the treatment',
  },
  'td.bullet3': {
    id: 'Poin Ameris Privilege otomatis di tiap transaksi',
    en: 'Ameris Privilege points automatically on every transaction',
  },
  'td.relatedTitle': { id: 'Treatment {category} lainnya', en: 'More {category} treatments' },

  // ── Booking (/booking) ────────────────────────────────────────────
  'bk.eyebrow': { id: 'Booking', en: 'Booking' },
  'bk.title': { id: 'Atur jadwal kunjunganmu', en: 'Schedule your visit' },
  'bk.subtitle': {
    id: 'Pilih tanggal & jam, lalu metode pembayaran. Hanya butuh satu menit.',
    en: 'Pick a date & time, then a payment method. It only takes a minute.',
  },
  'bk.step1': { id: 'Pilih tanggal & jam', en: 'Pick a date & time' },
  'bk.step2': { id: 'Metode pembayaran', en: 'Payment method' },
  'bk.prevWeek': { id: 'Minggu sebelumnya', en: 'Previous week' },
  'bk.nextWeek': { id: 'Minggu berikutnya', en: 'Next week' },
  'bk.chooseTime': { id: 'Pilih jam', en: 'Choose a time' },
  'bk.pickDateFirst': {
    id: 'Pilih tanggal dulu untuk melihat slot yang tersedia.',
    en: 'Pick a date first to see available slots.',
  },
  'pay.transfer.title': { id: 'Transfer Bank', en: 'Bank Transfer' },
  'pay.transfer.sub': { id: 'QRIS / Virtual Account', en: 'QRIS / Virtual Account' },
  'pay.online.title': { id: 'Bayar online', en: 'Pay online' },
  'pay.online.sub': { id: 'Kartu / e-wallet', en: 'Card / e-wallet' },
  'pay.klinik.title': { id: 'Bayar di klinik', en: 'Pay at the clinic' },
  'pay.klinik.sub': { id: 'Saat datang', en: 'On arrival' },
  'bk.payFull': { id: 'Bayar penuh', en: 'Pay in full' },
  'bk.payDp': { id: 'DP 50%', en: '50% deposit' },
  'bk.summary': { id: 'Ringkasan booking', en: 'Booking summary' },
  'bk.date': { id: 'Tanggal', en: 'Date' },
  'bk.time': { id: 'Jam', en: 'Time' },
  'bk.estPoints': { id: 'Estimasi poin', en: 'Estimated points' },
  'bk.total': { id: 'Total', en: 'Total' },
  'bk.payNow': { id: 'Bayar sekarang', en: 'Pay now' },
  'bk.atClinic': { id: 'di klinik', en: 'at clinic' },
  'bk.processing': { id: 'Memproses…', en: 'Processing…' },
  'bk.confirm': { id: 'Konfirmasi booking', en: 'Confirm booking' },
  'bk.confirmShort': { id: 'Konfirmasi', en: 'Confirm' },
  'bk.pickDateTime': { id: 'Pilih tanggal & jam', en: 'Pick a date & time' },
  'bk.secure': {
    id: 'Pembayaran aman · bisa dijadwalkan ulang',
    en: 'Secure payment · reschedulable',
  },
  'bk.emptyTitle': { id: 'Belum ada treatment dipilih', en: 'No treatment selected yet' },
  'bk.emptyBody': {
    id: 'Pilih treatment dulu sebelum mengatur jadwal booking.',
    en: 'Choose a treatment before scheduling a booking.',
  },
  'bk.emptyCta': { id: 'Lihat menu treatment', en: 'View treatment menu' },
  // Booking success screen
  'bk.s.paidTitle': { id: 'Pembayaran berhasil!', en: 'Payment successful!' },
  'bk.s.paidSub': {
    id: 'Bukti janji temu sudah terbit. Sampai jumpa di {location} ✦',
    en: 'Your appointment confirmation is ready. See you at {location} ✦',
  },
  'bk.s.pendingTitle': { id: 'Menunggu pembayaran', en: 'Awaiting payment' },
  'bk.s.pendingSub': {
    id: 'Selesaikan pembayaran agar booking-mu dikonfirmasi.',
    en: 'Complete the payment to confirm your booking.',
  },
  'bk.s.createdTitle': { id: 'Booking dibuat ✦', en: 'Booking created ✦' },
  'bk.s.createdSub': {
    id: 'Pembayaran belum selesai — bisa dilanjutkan kapan saja.',
    en: "Payment isn't complete — you can continue anytime.",
  },
  'bk.s.successTitle': { id: 'Booking berhasil!', en: 'Booking confirmed!' },
  'bk.s.payAtClinic': { id: 'Bayar di klinik', en: 'Pay at the clinic' },
  'bk.s.statusPaid': { id: 'Lunas', en: 'Paid' },
  'bk.s.statusPending': { id: 'Menunggu', en: 'Awaiting' },
  'bk.s.statusUnpaid': { id: 'Belum dibayar', en: 'Unpaid' },
  'bk.s.methodTransfer': { id: 'QRIS / Transfer Bank', en: 'QRIS / Bank Transfer' },
  'bk.s.methodOnline': { id: 'Online', en: 'Online' },
  'bk.s.bookingNo': { id: 'No. Booking', en: 'Booking no.' },
  'bk.s.payment': { id: 'Pembayaran', en: 'Payment' },
  'bk.s.retryPending': { id: 'Cek / lanjutkan pembayaran', en: 'Check / continue payment' },
  'bk.s.viewInAccount': { id: 'Lihat di akun saya', en: 'View in my account' },
  'bk.s.bookAgain': { id: 'Booking lagi', en: 'Book again' },
  // Weekday short labels (Mon-first)
  'wd.mon': { id: 'Sen', en: 'Mon' },
  'wd.tue': { id: 'Sel', en: 'Tue' },
  'wd.wed': { id: 'Rab', en: 'Wed' },
  'wd.thu': { id: 'Kam', en: 'Thu' },
  'wd.fri': { id: 'Jum', en: 'Fri' },
  'wd.sat': { id: 'Sab', en: 'Sat' },
  'wd.sun': { id: 'Min', en: 'Sun' },

  // ── Shared ────────────────────────────────────────────────────────
  'common.redirecting': { id: 'Mengarahkan…', en: 'Redirecting…' },
  'common.saving': { id: 'Menyimpan…', en: 'Saving…' },
  'status.Menunggu': { id: 'Menunggu', en: 'Pending' },
  'status.Dikonfirmasi': { id: 'Dikonfirmasi', en: 'Confirmed' },
  'status.Hadir': { id: 'Hadir', en: 'Attended' },
  'status.Selesai': { id: 'Selesai', en: 'Completed' },
  'status.Batal': { id: 'Batal', en: 'Cancelled' },

  // ── Cart (/keranjang) ─────────────────────────────────────────────
  'kr.eyebrow': { id: 'Keranjang', en: 'Cart' },
  'kr.title': { id: 'Treatment pilihanmu', en: 'Your selected treatments' },
  'kr.emptyTitle': { id: 'Keranjangmu masih kosong', en: 'Your cart is empty' },
  'kr.emptyBody': {
    id: 'Yuk pilih treatment favoritmu dari menu Ameris.',
    en: 'Pick your favourite treatments from the Ameris menu.',
  },
  'kr.decrease': { id: 'Kurangi', en: 'Decrease' },
  'kr.increase': { id: 'Tambah', en: 'Increase' },
  'kr.removeAria': { id: 'Hapus {name}', en: 'Remove {name}' },
  'kr.summary': { id: 'Ringkasan', en: 'Summary' },
  'kr.subtotal': { id: 'Subtotal ({count} treatment)', en: 'Subtotal ({count} treatments)' },
  'kr.pointsWord': { id: 'poin', en: 'points' },
  'kr.continue': { id: 'Lanjut booking', en: 'Continue to booking' },
  'kr.addMore': { id: 'Tambah treatment lain', en: 'Add another treatment' },

  // ── Auth (/masuk) ─────────────────────────────────────────────────
  'au.sidePitch': {
    id: 'Masuk untuk booking treatment, kelola jadwal, dan kumpulkan poin Ameris Privilege Club.',
    en: 'Sign in to book treatments, manage your schedule, and earn Ameris Privilege Club points.',
  },
  'au.welcomeBack': { id: 'Selamat datang kembali', en: 'Welcome back' },
  'au.createAccount': { id: 'Buat akun Ameris', en: 'Create your Ameris account' },
  'au.signinSub': {
    id: 'Masuk dengan email & password akunmu.',
    en: 'Sign in with your account email & password.',
  },
  'au.signupSub': {
    id: 'Daftar pakai email & password untuk mulai booking.',
    en: 'Sign up with email & password to start booking.',
  },
  'au.googleSignin': { id: 'Masuk dengan Google', en: 'Sign in with Google' },
  'au.googleSignup': { id: 'Daftar dengan Google', en: 'Sign up with Google' },
  'au.or': { id: 'atau', en: 'or' },
  'au.fullName': { id: 'Nama lengkap', en: 'Full name' },
  'au.namePlaceholder': { id: 'Nama kamu', en: 'Your name' },
  'au.email': { id: 'Alamat email', en: 'Email address' },
  'au.emailPlaceholder': { id: 'nama@email.com', en: 'name@email.com' },
  'au.password': { id: 'Password', en: 'Password' },
  'au.passwordPlaceholder': { id: 'Minimal 6 karakter', en: 'At least 6 characters' },
  'au.showPw': { id: 'Tampilkan password', en: 'Show password' },
  'au.hidePw': { id: 'Sembunyikan password', en: 'Hide password' },
  'au.forgot': { id: 'Lupa password?', en: 'Forgot password?' },
  'au.birth': { id: 'Tanggal lahir', en: 'Date of birth' },
  'au.birthOptional': {
    id: '(opsional — untuk promo ulang tahun 🎁)',
    en: '(optional — for birthday promos 🎁)',
  },
  'au.signinSubmit': { id: 'Masuk', en: 'Sign in' },
  'au.signupSubmit': { id: 'Daftar & masuk', en: 'Sign up & continue' },
  'au.tabSignin': { id: 'Masuk', en: 'Sign in' },
  'au.tabSignup': { id: 'Daftar', en: 'Sign up' },
  'au.terms': {
    id: 'Dengan melanjutkan, kamu setuju dengan Ketentuan & Kebijakan Privasi Ameris.',
    en: "By continuing, you agree to Ameris' Terms & Privacy Policy.",
  },
  'au.ownerLogin': { id: 'Masuk sebagai Owner / Admin →', en: 'Sign in as Owner / Admin →' },
  'au.errSignin': { id: 'Email atau password salah.', en: 'Wrong email or password.' },
  'au.errSignup': { id: 'Gagal membuat akun.', en: "Couldn't create the account." },
  'au.errReset': { id: 'Gagal mengirim link reset.', en: "Couldn't send the reset link." },
  'au.errGoogle': { id: 'Gagal masuk dengan Google.', en: "Couldn't sign in with Google." },
  'au.forgotTitle': { id: 'Lupa password', en: 'Forgot password' },
  'au.forgotSub': {
    id: 'Masukkan email akunmu — kami kirim link untuk atur ulang password.',
    en: "Enter your account email — we'll send a link to reset your password.",
  },
  'au.checkEmail': { id: 'Cek email kamu', en: 'Check your email' },
  'au.checkEmailBody1': { id: 'Kalau ', en: 'If ' },
  'au.checkEmailBody2': {
    id: ' terdaftar, link reset password sudah dikirim.',
    en: ' is registered, a password-reset link has been sent.',
  },
  'au.devReset': {
    id: 'Dev: link reset tampil di konsol server.',
    en: 'Dev: the reset link appears in the server console.',
  },
  'au.sending': { id: 'Mengirim…', en: 'Sending…' },
  'au.sendReset': { id: 'Kirim link reset', en: 'Send reset link' },
  'au.backToSignin': { id: 'Kembali ke masuk', en: 'Back to sign in' },

  // ── Reset password (/reset-password) ──────────────────────────────
  'rp.invalidTitle': { id: 'Link tidak valid', en: 'Invalid link' },
  'rp.invalidBody': {
    id: 'Link reset password tidak lengkap atau sudah dipakai. Minta link baru dari halaman lupa password.',
    en: 'The reset link is incomplete or already used. Request a new one from the forgot-password page.',
  },
  'rp.doneTitle': { id: 'Password berhasil diubah', en: 'Password changed' },
  'rp.doneBody': { id: 'Silakan masuk dengan password barumu.', en: 'Please sign in with your new password.' },
  'rp.signinNow': { id: 'Masuk sekarang', en: 'Sign in now' },
  'rp.title': { id: 'Atur ulang password', en: 'Reset your password' },
  'rp.sub': {
    id: 'Buat password baru minimal 6 karakter untuk akunmu.',
    en: 'Create a new password of at least 6 characters for your account.',
  },
  'rp.newPw': { id: 'Password baru', en: 'New password' },
  'rp.confirmPw': { id: 'Konfirmasi password baru', en: 'Confirm new password' },
  'rp.confirmPlaceholder': { id: 'Ulangi password baru', en: 'Repeat the new password' },
  'rp.mismatch': { id: 'Konfirmasi password tidak cocok.', en: 'Password confirmation does not match.' },
  'rp.errGeneric': {
    id: 'Gagal mengubah password. Link mungkin sudah kedaluwarsa.',
    en: 'Could not change the password. The link may have expired.',
  },
  'rp.save': { id: 'Simpan password baru', en: 'Save new password' },

  // ── Change password card ──────────────────────────────────────────
  'cp.title': { id: 'Ubah password', en: 'Change password' },
  'cp.sub': {
    id: 'Masukkan password saat ini, lalu password baru minimal 6 karakter.',
    en: 'Enter your current password, then a new password of at least 6 characters.',
  },
  'cp.current': { id: 'Password saat ini', en: 'Current password' },
  'cp.new': { id: 'Password baru', en: 'New password' },
  'cp.confirm': { id: 'Konfirmasi password baru', en: 'Confirm new password' },
  'cp.show': { id: 'Tampilkan', en: 'Show' },
  'cp.hide': { id: 'Sembunyikan', en: 'Hide' },
  'cp.pwSuffix': { id: 'password', en: 'password' },
  'cp.mismatch': { id: 'Konfirmasi password tidak cocok.', en: 'Password confirmation does not match.' },
  'cp.sameAsOld': {
    id: 'Password baru harus berbeda dari yang lama.',
    en: 'The new password must differ from the old one.',
  },
  'cp.errCurrentWrong': { id: 'Password saat ini salah.', en: 'Current password is incorrect.' },
  'cp.errGeneric': { id: 'Gagal mengubah password.', en: 'Could not change the password.' },
  'cp.submit': { id: 'Ubah password', en: 'Change password' },
  'cp.success': { id: 'Password berhasil diubah', en: 'Password changed' },

  // ── Account layout (/akun) ────────────────────────────────────────
  'ac.nav.overview': { id: 'Ringkasan', en: 'Overview' },
  'ac.nav.bookings': { id: 'Booking saya', en: 'My bookings' },
  'ac.nav.privilege': { id: 'Privilege Club', en: 'Privilege Club' },
  'ac.nav.profile': { id: 'Profil', en: 'Profile' },
  'ac.member': { id: 'Member', en: 'Member' },
  'ac.followUs': { id: 'Ikuti kami', en: 'Follow us' },
  'ac.loading': { id: 'Memuat…', en: 'Loading…' },

  // ── Account overview (/akun) ──────────────────────────────────────
  'ov.hi': { id: 'Halo,', en: 'Hi,' },
  'ov.welcome': { id: 'Selamat datang kembali di portal Ameris.', en: 'Welcome back to the Ameris portal.' },
  'ov.bdayToday': { id: 'Selamat ulang tahun! 🎉', en: 'Happy birthday! 🎉' },
  'ov.bdaySoon': { id: 'Ulang tahunmu {days} hari lagi 🎁', en: 'Your birthday is in {days} days 🎁' },
  'ov.bdayBody': {
    id: 'Nikmati promo & freebies spesial menyambut {date}.',
    en: 'Enjoy special promos & freebies for {date}.',
  },
  'ov.bdayClaim': { id: 'Klaim promo ultah', en: 'Claim birthday promo' },
  'ov.points': { id: 'Poin Privilege', en: 'Privilege Points' },
  'ov.redeem': { id: 'Tukar poin', en: 'Redeem points' },
  'ov.activeBookings': { id: 'Booking aktif', en: 'Active bookings' },
  'ov.viewAll': { id: 'Lihat semua', en: 'View all' },
  'ov.doneTreatments': { id: 'Treatment selesai', en: 'Completed treatments' },
  'ov.totalVisits': { id: 'Total kunjungan selesai', en: 'Total completed visits' },
  'ov.upcoming': { id: 'Jadwal terdekat', en: 'Upcoming appointment' },
  'ov.atTime': { id: 'Pukul {time} WIB · No. {id}', en: 'At {time} WIB · No. {id}' },
  'ov.ticket': { id: 'Bukti janji temu', en: 'Appointment ticket' },
  'ov.noUpcoming': { id: 'Belum ada jadwal mendatang.', en: 'No upcoming appointments yet.' },
  'ov.promoPrefix': { id: 'Promo: {name}', en: 'Promo: {name}' },
  'ov.take': { id: 'Ambil', en: 'Get it' },
  'ov.notifications': { id: 'Notifikasi', en: 'Notifications' },
  'ov.newCount': { id: '{count} baru', en: '{count} new' },
  'ov.glowTitle': { id: 'Siap untuk glow up berikutnya?', en: 'Ready for your next glow up?' },
  'ov.glowBody': { id: 'Pesan treatment favoritmu sekarang.', en: 'Book your favourite treatment now.' },
  'ov.bookTreatment': { id: 'Booking treatment', en: 'Book a treatment' },
  'ov.vouchers': { id: 'Voucher kamu', en: 'Your vouchers' },
  'ov.voucherAllTreatments': { id: 'Semua treatment', en: 'All treatments' },
  'ov.voucherUntil': { id: 'Berlaku s/d {date}', en: 'Valid until {date}' },
  'ov.voucherUse': { id: 'Pakai sekarang', en: 'Use now' },
  'ov.voucherHint': {
    id: 'Diskon otomatis terpasang saat checkout.',
    en: 'Discount is applied automatically at checkout.',
  },

  // ── My bookings (/akun/booking) ───────────────────────────────────
  'mb.title': { id: 'Booking saya', en: 'My bookings' },
  'mb.sub': { id: 'Riwayat dan jadwal kunjunganmu di Ameris.', en: 'Your booking history and schedule at Ameris.' },
  'mb.tabAll': { id: 'Semua', en: 'All' },
  'mb.tabUpcoming': { id: 'Mendatang', en: 'Upcoming' },
  'mb.tabDone': { id: 'Selesai', en: 'Completed' },
  'mb.empty': { id: 'Belum ada booking di kategori ini.', en: 'No bookings in this category yet.' },
  'mb.payOnline': { id: 'Bayar online', en: 'Paid online' },
  'mb.payClinic': { id: 'Bayar di klinik', en: 'Pay at the clinic' },
  'mb.reschedule': { id: 'Ubah jadwal', en: 'Reschedule' },
  'mb.cancel': { id: 'Batalkan', en: 'Cancel' },

  // ── Booking ticket (/akun/booking/$id) ────────────────────────────
  'tk.back': { id: 'Kembali ke booking', en: 'Back to bookings' },
  'tk.notFoundTitle': { id: 'Bukti janji temu tidak ditemukan', en: 'Appointment ticket not found' },
  'tk.notFoundBody': { id: 'Booking dengan nomor {id} tidak tersedia.', en: 'Booking number {id} is not available.' },
  'tk.title': { id: 'Bukti janji temu', en: 'Appointment ticket' },
  'tk.sub': { id: 'Tunjukkan kode ini saat tiba di klinik.', en: 'Show this code when you arrive at the clinic.' },
  'tk.date': { id: 'Tanggal', en: 'Date' },
  'tk.time': { id: 'Jam', en: 'Time' },
  'tk.location': { id: 'Lokasi', en: 'Location' },
  'tk.payOnline': { id: 'Pembayaran online', en: 'Paid online' },
  'tk.payTransfer': { id: 'Pembayaran QRIS / transfer', en: 'Paid via QRIS / transfer' },
  'tk.payClinic': { id: 'Pembayaran di klinik', en: 'Pay at the clinic' },
  'tk.payDpNow': { id: 'Bayar DP sekarang', en: 'Pay deposit now' },
  'tk.dpPaid': {
    id: 'DP terbayar online · sisa dilunasi di klinik',
    en: 'Deposit paid online · balance due at the clinic',
  },
  'tk.addCalendar': { id: 'Tambah ke kalender', en: 'Add to calendar' },
  'tk.contactClinic': { id: 'Hubungi klinik', en: 'Contact the clinic' },
  'tk.qrAria': { id: 'Kode booking {value}', en: 'Booking code {value}' },

  // ── Privilege (/akun/privilege) ───────────────────────────────────
  'pv.sub': {
    id: 'Setiap transaksi Rp1.000.000 = 1 poin. Tukar dengan treatment gratis.',
    en: 'Every Rp1,000,000 spent = 1 point. Redeem for free treatments.',
  },
  'pv.balance': { id: 'Saldo poin kamu', en: 'Your point balance' },
  'pv.toNext1': { id: '{n} poin lagi untuk menukar ', en: '{n} more points to redeem ' },
  'pv.redeemTitle': { id: 'Tukarkan poin', en: 'Redeem points' },
  'pv.redeem': { id: 'Tukar', en: 'Redeem' },
  'pv.locked': { id: 'Terkunci', en: 'Locked' },
  'pv.history': { id: 'Riwayat poin', en: 'Point history' },
  'pv.pointsWord': { id: 'poin', en: 'points' },

  // ── Profile (/akun/profil) ────────────────────────────────────────
  'pf.title': { id: 'Profil', en: 'Profile' },
  'pf.sub': { id: 'Kelola data akunmu di Ameris.', en: 'Manage your Ameris account details.' },
  'pf.name': { id: 'Nama lengkap', en: 'Full name' },
  'pf.birth': { id: 'Tanggal lahir', en: 'Date of birth' },
  'pf.whatsapp': { id: 'Nomor WhatsApp', en: 'WhatsApp number' },
  'pf.email': { id: 'Email', en: 'Email' },
  'pf.birthNote': {
    id: '🎁 Tanggal lahir dipakai untuk kejutan promo ulang tahun dari Ameris.',
    en: '🎁 Your date of birth is used for Ameris birthday-promo surprises.',
  },
  'pf.save': { id: 'Simpan perubahan', en: 'Save changes' },
  'pf.saved': { id: 'Tersimpan', en: 'Saved' },

  // ── About / Tentang Kami (/tentang) ───────────────────────────────
  'nav.about': { id: 'Tentang', en: 'About' },
  'about.tag': { id: 'Tentang Ameris', en: 'About Ameris' },
  'about.title': { id: 'Tentang Kami', en: 'About Us' },
  'about.lead': {
    id: 'Klinik kecantikan modern di Gading Serpong yang merawat setiap pasien dengan standar medis, kenyamanan, dan hasil yang natural.',
    en: 'A modern aesthetic clinic in Gading Serpong, caring for every patient with medical standards, comfort, and natural results.',
  },

  'about.founder.eyebrow': { id: 'Founder Kami', en: 'Our Founder' },
  'about.founder.title1': { id: 'Kulitmu Dirawat Langsung oleh', en: 'Your Skin, Always in' },
  'about.founder.titleAccent': { id: 'Ahlinya', en: 'Expert Hands' },
  'about.founder.body': {
    id: 'dr. Meriana, M.Kes (AAM) memimpin langsung setiap konsultasi dan perawatan di Ameris. Dengan pendekatan yang aman, teliti, dan personal, ia memastikan setiap pasien mendapatkan hasil terbaik sesuai kebutuhan kulitnya.',
    en: 'dr. Meriana, M.Kes (AAM) personally leads every consultation and treatment at Ameris. With a safe, meticulous, and personal approach, she ensures each patient gets the best result for their skin.',
  },
  'about.founder.role': { id: 'Founder & Dokter Estetika', en: 'Founder & Aesthetic Doctor' },

  'about.story.eyebrow': { id: 'Cerita Kami', en: 'Our Story' },
  'about.story.title1': { id: 'Cerita', en: 'The Ameris' },
  'about.story.titleAccent': { id: 'Ameris', en: 'Story' },
  'about.story.body1': {
    id: 'Ameris Aesthetic Clinic hadir di Gading Serpong sejak 29 Januari 2026 dengan satu misi: membuat perawatan kecantikan berkualitas medis menjadi mudah diakses, nyaman, dan tepat sasaran.',
    en: 'Ameris Aesthetic Clinic opened in Gading Serpong on 29 January 2026 with one mission: to make medical-grade beauty care accessible, comfortable, and precise.',
  },
  'about.story.body2': {
    id: 'Mengusung filosofi #RefineYourBeauty, kami percaya kecantikan terbaik adalah versi dirimu yang paling sehat dan percaya diri — dirawat dengan teknologi modern dan sentuhan personal.',
    en: 'Guided by our #RefineYourBeauty philosophy, we believe the best beauty is the healthiest, most confident version of you — cared for with modern technology and a personal touch.',
  },
  'about.story.cta': { id: 'Lihat Treatment', en: 'Explore Treatments' },
  'about.story.statRating': { id: 'Rating Google', en: 'Google Rating' },
  'about.story.statTreatments': { id: 'Pilihan Treatment', en: 'Treatments' },
  'about.story.statSince': { id: 'Berdiri Sejak', en: 'Established' },

  'about.why.eyebrow': { id: 'Kenapa Ameris', en: 'Why Ameris' },
  'about.why.title1': { id: 'Kenapa Memilih', en: 'Why Choose' },
  'about.why.titleAccent': { id: 'Ameris', en: 'Ameris' },
  'about.why.subtitle': {
    id: 'Perawatan berkualitas medis dengan kenyamanan dan hasil yang bisa kamu percaya.',
    en: 'Medical-grade care with comfort and results you can trust.',
  },
  'about.why.doctor.title': { id: 'Ditangani Dokter', en: 'Doctor-Led Care' },
  'about.why.doctor.body': {
    id: 'Setiap perawatan diawasi langsung oleh dokter estetika berpengalaman.',
    en: 'Every treatment is supervised directly by an experienced aesthetic doctor.',
  },
  'about.why.hygiene.title': { id: 'Higienis & Nyaman', en: 'Hygienic & Comfortable' },
  'about.why.hygiene.body': {
    id: 'Ruangan bersih, steril, dan nyaman untuk pengalaman perawatan terbaik.',
    en: 'Clean, sterile, and comfortable rooms for the best treatment experience.',
  },
  'about.why.tech.title': { id: 'Teknologi Modern', en: 'Modern Technology' },
  'about.why.tech.body': {
    id: 'Alat & teknik terkini — dari Pico laser hingga skinbooster & exosome.',
    en: 'The latest tools and techniques — from Pico laser to skinboosters and exosomes.',
  },
  'about.why.natural.title': { id: 'Hasil Natural', en: 'Natural Results' },
  'about.why.natural.body': {
    id: 'Fokus pada hasil yang aman, natural, dan sesuai karakter wajahmu.',
    en: 'Focused on safe, natural results that suit your features.',
  },

  'about.team.eyebrow': { id: 'Tim Kami', en: 'Our Team' },
  'about.team.title1': { id: 'Tim Profesional', en: 'Our Professional' },
  'about.team.titleAccent': { id: 'Ameris', en: 'Team' },
  'about.team.subtitle': {
    id: 'Tim dokter, terapis, dan staf yang siap merawatmu dengan sepenuh hati.',
    en: 'A team of doctors, therapists, and staff ready to care for you wholeheartedly.',
  },
  'about.team.role.doctor': { id: 'Dokter Estetika', en: 'Aesthetic Doctor' },
  'about.team.role.therapist': { id: 'Beauty Therapist', en: 'Beauty Therapist' },
  'about.team.role.care': { id: 'Customer Care', en: 'Customer Care' },
  'about.team.doctorName': { id: 'Tim Dokter Ameris', en: 'Ameris Doctors' },
  'about.team.therapistName': { id: 'Certified Therapist', en: 'Certified Therapists' },
  'about.team.careName': { id: 'Front Office', en: 'Front Office' },

  // ── About Me (landing) — reuses about.founder.* for eyebrow/title/body/role ──
  'aboutme.cred1': { id: 'Konsultasi & perawatan dipandu langsung oleh dokter', en: 'Consultation and treatment guided directly by a doctor' },
  'aboutme.cred2': { id: 'Bersertifikasi Anti-Aging Medicine (AAM)', en: 'Certified in Anti-Aging Medicine (AAM)' },
  'aboutme.cred3': { id: 'Teknologi Korea & exosome terkini untuk hasil natural', en: 'Latest Korean and exosome technology for natural results' },
  'aboutme.readStory': { id: 'Baca kisah kami', en: 'Read our story' },

  // ── Statistics ──
  'stats.eyebrow': { id: 'Statistik', en: 'By the Numbers' },
  'stats.title1': { id: 'Bukti', en: 'Proof in the' },
  'stats.titleAccent': { id: 'kepercayaan', en: 'trust' },
  'stats.title3': { id: 'yang pasien berikan', en: 'our patients place in us' },
  'stats.desc': { id: 'Hasil, konsistensi, dan kenyamanan yang membuat pasien kembali lagi.', en: 'Results, consistency, and comfort that keep patients coming back.' },
  'stats.ratingLabel': { id: 'Rating Google', en: 'Google rating' },
  'stats.ratingNote': { id: 'dari ulasan pasien', en: 'from patient reviews' },
  'stats.treatmentsLabel': { id: 'Pilihan treatment', en: 'Treatment options' },
  'stats.treatmentsNote': { id: 'facial, laser, skinbooster & lainnya', en: 'facial, laser, skinbooster and more' },
  'stats.sinceLabel': { id: 'Berdiri sejak', en: 'Established' },
  'stats.sinceNote': { id: 'di Gading Serpong', en: 'in Gading Serpong' },
  'stats.techLabel': { id: 'Teknologi Korea', en: 'Korean technology' },
  'stats.techNote': { id: 'Pico laser & exosome terkini', en: 'latest Pico laser and exosome' },

  // ── Services ──
  'services.eyebrow': { id: 'Layanan', en: 'Services' },
  'services.title1': { id: 'Rangkaian', en: 'A full range of' },
  'services.titleAccent': { id: 'perawatan', en: 'treatments' },
  'services.title3': { id: 'untuk setiap kebutuhan kulit', en: 'for every skin need' },
  'services.desc': { id: 'Dari facial rutin hingga teknologi laser & injectable — semua dipandu dokter.', en: 'From routine facials to laser and injectable technology — all doctor-guided.' },
  'services.explore': { id: 'Lihat treatment', en: 'Explore' },
  'services.Facial': { id: 'Pembersihan mendalam, hidrasi, dan glow untuk perawatan rutin.', en: 'Deep cleansing, hydration, and glow for routine care.' },
  'services.Peeling': { id: 'Eksfoliasi terkontrol untuk meratakan warna dan tekstur kulit.', en: 'Controlled exfoliation to even out skin tone and texture.' },
  'services.Laser': { id: 'Korean Pico & DPL untuk pigmentasi, pori, dan peremajaan.', en: 'Korean Pico and DPL for pigmentation, pores, and rejuvenation.' },
  'services.Skinbooster': { id: 'Hidrasi mendalam & stimulasi kolagen dari dalam kulit.', en: 'Deep hydration and collagen stimulation from within.' },
  'services.Injeksi': { id: 'Botox, filler, meso, dan IV drip oleh dokter.', en: 'Botox, filler, meso, and IV drip by a doctor.' },
  'services.Paket': { id: 'Paket signature gabungan untuk hasil paling maksimal.', en: 'Combined signature packages for the most complete results.' },
  'services.countSuffix': { id: 'treatment', en: 'treatments' },

  // ── Exclusive Packages (marquee) ──
  'pkg.eyebrow': { id: 'Paket Eksklusif', en: 'Exclusive Packages' },
  'pkg.title1': { id: 'Ritual yang dirancang membangunkan', en: 'Rituals designed to awaken your' },
  'pkg.titleAccent': { id: 'kulit bercahaya', en: 'glow' },
  'pkg.desc': { id: 'Paket signature yang memadukan beberapa perawatan untuk hasil paling maksimal.', en: 'Signature packages that combine several treatments for the most complete results.' },
  'pkg.includes': { id: 'Termasuk', en: 'Includes' },
  'pkg.cta': { id: 'Pilih paket', en: 'Choose package' },

  // ── New Arrivals ──
  'arrivals.eyebrow': { id: 'Terbaru', en: 'New Arrivals' },
  'arrivals.title1': { id: 'Inovasi', en: 'The latest at' },
  'arrivals.titleAccent': { id: 'terbaru kami', en: 'Ameris' },
  'arrivals.desc': { id: 'Teknologi dan perawatan terkini yang baru hadir di Ameris.', en: 'The newest technology and treatments now available at Ameris.' },
  'arrivals.seeAll': { id: 'Lihat semua', en: 'See all' },

  // ── Contact ──
  'contact.eyebrow': { id: 'Kontak', en: 'Contact' },
  'contact.title1': { id: 'Kunjungi', en: 'Visit' },
  'contact.titleAccent': { id: 'Ameris', en: 'Ameris' },
  'contact.desc': { id: 'Temukan kami di jantung Gading Serpong — tenang, hangat, dan dirancang untuk ritual glow-up kamu.', en: 'Find us in the heart of Gading Serpong — calm, warm, and designed for your glow-up ritual.' },
  'contact.addressTitle': { id: 'Alamat klinik', en: 'Clinic address' },
  'contact.reachTitle': { id: 'Hubungi kami', en: 'Reach us' },
  'contact.followTitle': { id: 'Ikuti kami', en: 'Follow us' },
  'contact.openMaps': { id: 'Buka di Google Maps', en: 'Open in Google Maps' },
  'contact.cta': { id: 'Booking sekarang', en: 'Book now' },
  'contact.chat': { id: 'Chat WhatsApp', en: 'Chat on WhatsApp' },

  // ── Nav additions ──
  'nav.services': { id: 'Layanan', en: 'Services' },
  'nav.contact': { id: 'Kontak', en: 'Contact' },
} satisfies Record<string, { id: string; en: string }>

export type DictKey = keyof typeof dict
export { dict }
