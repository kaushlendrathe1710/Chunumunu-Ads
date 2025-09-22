CREATE TYPE "public"."impression_status" AS ENUM('reserved', 'served', 'confirmed', 'expired', 'cancelled');--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "campaign_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "status" "impression_status" DEFAULT 'confirmed';--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "viewer_id" text;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "video_id" text;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "cost_cents" integer;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "served_at" timestamp;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_token_unique" UNIQUE("token");