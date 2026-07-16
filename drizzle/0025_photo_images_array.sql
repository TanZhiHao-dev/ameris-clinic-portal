ALTER TABLE "patient_photo_sets" ADD COLUMN "images" text;
--> statement-breakpoint
UPDATE "patient_photo_sets"
SET "images" = to_json(ARRAY(
  SELECT v FROM unnest(ARRAY["front_image", "left_image", "right_image"]) AS v WHERE v IS NOT NULL
))::text
WHERE "images" IS NULL;
