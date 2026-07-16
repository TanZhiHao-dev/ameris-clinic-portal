CREATE TABLE "patient_photo_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phase" text NOT NULL,
	"label" text,
	"front_image" text,
	"left_image" text,
	"right_image" text,
	"note" text,
	"taken_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_photo_sets" ADD CONSTRAINT "patient_photo_sets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;