import { pgTable, text, serial, timestamp, integer, decimal, json } from 'drizzle-orm/pg-core';
import { ads, campaigns } from './campaign.schema';
import { impressionActionEnum, deviceTypeEnum, osTypeEnum, impressionStatusEnum } from './enums';

export const adImpressions = pgTable('ad_impressions', {
  id: serial('id').primaryKey(),
  adId: integer('ad_id')
    .notNull()
    .references(() => ads.id, { onDelete: 'cascade' }),
  campaignId: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),

  // Serving and reservation fields
  token: text('token').unique(), // Token for impression tracking (null for legacy records)
  status: impressionStatusEnum('status').default('confirmed'), // Default for backward compatibility
  expiresAt: timestamp('expires_at'), // When this impression expires (for served ads)

  // Platform user ID (not our app's user ID since ads run on external platforms)
  platformUserId: text('platform_user_id'), // ID from the streaming platform
  viewerId: text('viewer_id'), // Optional viewer ID from client (new field)
  sessionId: text('session_id'), // for tracking sessions
  action: impressionActionEnum('action').notNull(),

  // Device information (simplified)
  deviceType: deviceTypeEnum('device_type'),
  osType: osTypeEnum('os_type'),

  // Content context (enhanced)
  videoId: text('video_id'), // ID of video where ad was shown (enhanced from contentId)
  contentId: text('content_id'), // Legacy field - ID of the video/content where ad was shown
  contentTitle: text('content_title'), // title of the content
  category: text('category'), // Category of the content (new field)
  tags: text('tags').array(), // Tags of the content (new field)

  // Engagement metrics
  viewDuration: integer('view_duration'), // in seconds
  videoProgress: decimal('video_progress', { precision: 5, scale: 2 }), // percentage watched (0-100)

  // Platform context
  platformName: text('platform_name'), // e.g., 'youtube', 'netflix', 'hulu', etc.

  // Cost tracking (enhanced)
  costPerAction: decimal('cost_per_action', { precision: 10, scale: 4 }), // cost for this specific action
  costCents: integer('cost_cents'), // Cost in cents for this impression (new field)

  // Metadata (enhanced)
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),

  // Timestamps (enhanced)
  timestamp: timestamp('timestamp').defaultNow(),
  servedAt: timestamp('served_at'), // When ad was actually served (new field)
  confirmedAt: timestamp('confirmed_at'), // When impression was confirmed (new field)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
