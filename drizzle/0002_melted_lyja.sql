CREATE TABLE "doctor_treatments" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"treatment_id" text NOT NULL,
	"share_pct" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctor_treatments" ADD CONSTRAINT "doctor_treatments_doctor_id_user_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_treatments" ADD CONSTRAINT "doctor_treatments_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;