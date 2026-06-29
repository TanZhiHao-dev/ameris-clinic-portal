ALTER TABLE "treatments" ADD COLUMN "min_units" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "unit_presets" text;