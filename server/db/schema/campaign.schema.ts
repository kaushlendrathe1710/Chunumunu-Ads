import { pgTable, text, serial, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { teams } from './team.schema';
import { campaignStatusEnum, adStatusEnum } from './enums';

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: campaignStatusEnum('status').notNull().default('draft'),
  budget: decimal('budget', { precision: 10, scale: 2 }), // using decimal for better precision
  spent: decimal('spent', { precision: 10, scale: 2 }).default('0'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ads = pgTable('ads', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  categories: text('categories').array().notNull(), // will store categories as array from external service
  tags: text('tags').array().notNull(), // will store tags as array from external service
  ctaLink: text('cta_link'),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(), // mandatory thumbnail
  status: adStatusEnum('status').notNull().default('draft'),
  budget: decimal('budget', { precision: 10, scale: 2 }), // ad-specific budget
  spent: decimal('spent', { precision: 10, scale: 2 }).default('0'),
  campaignId: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
