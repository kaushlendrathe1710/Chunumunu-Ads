import { pgEnum } from 'drizzle-orm/pg-core';

// Campaign status enum
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
]);

// Ad status enum
export const adStatusEnum = pgEnum('ad_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'rejected',
  'under_review',
]);

// Impression action type enum
export const impressionActionEnum = pgEnum('impression_action', [
  'view',
  'click',
  'skip',
  'complete',
  'pause',
  'resume',
  'mute',
  'unmute',
]);

// Impression status enum for tracking impression lifecycle
export const impressionStatusEnum = pgEnum('impression_status', [
  'reserved', // Ad is reserved for serving
  'served', // Ad has been served to viewer
  'confirmed', // Impression confirmed by viewer interaction
  'expired', // Token expired without confirmation
  'cancelled', // Impression was cancelled
]);

// Device type enum for analytics
export const deviceTypeEnum = pgEnum('device_type', [
  'desktop',
  'mobile',
  'tablet',
  'tv',
  'unknown',
]);

// Operating system enum
export const osTypeEnum = pgEnum('os_type', [
  'windows',
  'macos',
  'linux',
  'ios',
  'android',
  'tvos',
  'unknown',
]);
