import { relations } from 'drizzle-orm';
import { users, otpCodes, session } from './user.schema';
import { teams, teamMembers } from './team.schema';
import { campaigns, ads } from './campaign.schema';
import { wallets, transactions } from './wallet.schema';
import { adImpressions } from './analytics.schema';

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  ownedTeams: many(teams),
  teamMemberships: many(teamMembers),
  createdCampaigns: many(campaigns),
  createdAds: many(ads),
  wallet: one(wallets),
  // Note: adImpressions removed since ads run on external platforms
}));

// Team relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  campaigns: many(campaigns),
}));

// Team member relations
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

// Campaign relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  team: one(teams, {
    fields: [campaigns.teamId],
    references: [teams.id],
  }),
  creator: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  ads: many(ads),
}));

// Ad relations
export const adsRelations = relations(ads, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [ads.campaignId],
    references: [campaigns.id],
  }),
  creator: one(users, {
    fields: [ads.createdBy],
    references: [users.id],
  }),
  impressions: many(adImpressions),
}));

// Wallet relations
export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

// Transaction relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));

// Ad impressions relations
export const adImpressionsRelations = relations(adImpressions, ({ one }) => ({
  ad: one(ads, {
    fields: [adImpressions.adId],
    references: [ads.id],
  }),
  // Note: no user relation since ads run on external platforms
}));

// OTP codes table relations (standalone table for email verification)
export const otpCodesRelations = relations(otpCodes, () => ({}));

// Session table relations (standalone table for express-session)
export const sessionRelations = relations(session, () => ({}));
