-- Custom SQL migration file, put your code below! --
-- Free "Konsultasi Dokter" — a bookable, Rp0 catalog item so patients can book a
-- consultation slot online before deciding on a treatment. Idempotent: a re-run
-- (or a DB that already seeded it) is a no-op.
INSERT INTO "treatments" ("id", "name", "blurb", "blurb_en", "category", "duration", "price", "is_available", "beautician_bonus")
VALUES (
  'konsultasi',
  'Konsultasi Dokter',
  'Konsultasi kondisi kulit langsung dengan dokter sebelum menentukan treatment. Gratis untuk semua pasien.',
  'Talk to the doctor about your skin before choosing a treatment. Free for every patient.',
  'Konsultasi',
  '30 min',
  0,
  true,
  0
)
ON CONFLICT ("id") DO NOTHING;
