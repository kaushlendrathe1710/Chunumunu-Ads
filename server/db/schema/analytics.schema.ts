import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  decimal,
  json,
} from 'drizzle-orm/pg-core';
import { ads } from './campaign.schema';
import { impressionActionEnum, deviceTypeEnum, osTypeEnum } from './enums';

export const adImpressions = pgTable('ad_impressions', {
  id: serial('id').primaryKey(),
  adId: integer('ad_id')
    .notNull()
    .references(() => ads.id, { onDelete: 'cascade' }),
  
  // Platform user ID (not our app's user ID since ads run on external platforms)
  platformUserId: text('platform_user_id'), // ID from the streaming platform
  sessionId: text('session_id'), // for tracking sessions
  action: impressionActionEnum('action').notNull(),

  // Device information (simplified)
  deviceType: deviceTypeEnum('device_type'),
  osType: osTypeEnum('os_type'),

  // Engagement metrics
  viewDuration: integer('view_duration'), // in seconds
  videoProgress: decimal('video_progress', { precision: 5, scale: 2 }), // percentage watched (0-100)
  
  // Platform context
  platformName: text('platform_name'), // e.g., 'youtube', 'netflix', 'hulu', etc.
  contentId: text('content_id'), // ID of the video/content where ad was shown
  contentTitle: text('content_title'), // title of the content
  
  // Cost tracking
  costPerAction: decimal('cost_per_action', { precision: 10, scale: 4 }), // cost for this specific action

  // Timestamps
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
