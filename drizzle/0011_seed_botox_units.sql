-- Give the per-unit Botox treatments a sensible minimum + labelled quick-picks
-- (50 "daerah tertentu", 100 "full face"). Guarded with `unit_presets IS NULL`
-- so it never overwrites presets an owner has already set. Other treatments are
-- untouched.

UPDATE "treatments"
SET "min_units" = 50, "unit_presets" = '50=daerah tertentu, 100=full face'
WHERE "id" IN ('botox-korea', 'botox-us')
  AND "price_per_unit" = true
  AND "unit_presets" IS NULL;
