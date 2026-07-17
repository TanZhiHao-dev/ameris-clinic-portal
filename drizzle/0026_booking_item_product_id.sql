ALTER TABLE "booking_items" ADD COLUMN "product_id" text;
--> statement-breakpoint
UPDATE "booking_items" bi
SET "product_id" = p."id"
FROM "products" p
WHERE bi."treatment_id" IS NULL
  AND bi."product_id" IS NULL
  AND p."name" = bi."name_at_booking";
