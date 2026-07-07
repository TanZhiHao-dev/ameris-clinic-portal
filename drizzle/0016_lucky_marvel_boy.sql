CREATE TABLE "assists" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"bonus" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closings" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_id" text,
	"item_name" text NOT NULL,
	"price" integer NOT NULL,
	"bonus" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beauticians" ADD COLUMN "role" text DEFAULT 'beautician' NOT NULL;--> statement-breakpoint
ALTER TABLE "assists" ADD CONSTRAINT "assists_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closings" ADD CONSTRAINT "closings_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;