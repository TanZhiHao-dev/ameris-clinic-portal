ALTER TABLE "transactions" ADD COLUMN "midtrans_order_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "midtrans_status" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "snap_token" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "paid_at" timestamp;