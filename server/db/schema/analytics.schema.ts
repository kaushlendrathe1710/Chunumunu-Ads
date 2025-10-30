import { pgTable, text, serial, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
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
  token: text('token').unique(), // Token for impression tracking
  status: impressionStatusEnum('status').default('confirmed'),
  expiresAt: timestamp('expires_at'), // When this impression expires

  // User/session tracking
  viewerId: text('viewer_id'), // User ID if authenticated
  anonId: text('anon_id'), // Anonymous ID for unauthenticated users
  sessionId: text('session_id'), // for tracking sessions
  action: impressionActionEnum('action').notNull(),

  // Device information
  deviceType: deviceTypeEnum('device_type'),
  osType: osTypeEnum('os_type'),

  // Content context
  videoId: text('video_id'), // ID of video where ad was shown
  category: text('category'), // Category of the content
  tags: text('tags').array(), // Tags of the content

  // Cost tracking
  costCents: integer('cost_cents'), // Cost in cents for this impression

  // Basic metadata
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),

  // Timestamps
  servedAt: timestamp('served_at'), // When ad was actually served
  confirmedAt: timestamp('confirmed_at'), // When impression was confirmed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
