CREATE TABLE "beauticians" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "beautician_id" text;--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN "beautician_bonus" integer DEFAULT 0 NOT NULL;