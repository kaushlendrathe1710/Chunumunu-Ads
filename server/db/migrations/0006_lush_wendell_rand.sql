ALTER TYPE "public"."permission" ADD VALUE 'view_analytics';--> statement-breakpoint
ALTER TABLE "ad_impressions" DROP COLUMN "view_duration";--> statement-breakpoint
ALTER TABLE "ad_impressions" DROP COLUMN "video_progress";