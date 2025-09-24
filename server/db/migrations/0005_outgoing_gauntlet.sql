ALTER TABLE "otp_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "otp_codes" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "videostreampro_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" text DEFAULT 'videostreampro' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_videostreampro_id_unique" UNIQUE("videostreampro_id");