CREATE TABLE "voucher_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_id" text NOT NULL,
	"user_id" text NOT NULL,
	"booking_id" text,
	"amount_discounted" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_treatments" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_id" text NOT NULL,
	"treatment_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_users" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"discount_type" text DEFAULT 'pct' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"applies_to_all_normal" boolean DEFAULT false NOT NULL,
	"new_user_window_days" integer DEFAULT 7 NOT NULL,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"max_uses_per_user" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "voucher_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_treatments" ADD CONSTRAINT "voucher_treatments_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_treatments" ADD CONSTRAINT "voucher_treatments_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_users" ADD CONSTRAINT "voucher_users_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_users" ADD CONSTRAINT "voucher_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;