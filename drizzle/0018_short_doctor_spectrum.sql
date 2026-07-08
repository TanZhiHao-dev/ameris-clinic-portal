ALTER TABLE "inventory_items" ADD COLUMN "raw_count" text;
--> statement-breakpoint
-- Rename the legacy 'P3K' category to the full Stock Opname label so existing
-- items line up with the new category tabs (and re-imports don't duplicate them).
UPDATE "inventory_items" SET "category" = 'P3K & Emergency' WHERE "category" = 'P3K';