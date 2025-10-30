import { db } from '../connect';
import { adImpressions } from '../schema/analytics.schema';
import { campaigns, ads } from '../schema/campaign.schema';
import { teams } from '../schema/team.schema';
import { wallets } from '../schema/wallet.schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export class AnalyticsService {
  /**
   * Get overall analytics for a team
   */
  static async getTeamAnalytics(teamId: number) {
    // Get team info to find owner
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);

    if (!team) {
      throw new Error('Team not found');
    }

    // Get team owner's wallet balance as available budget
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, team.ownerId))
      .limit(1);

    const availableBudget = wallet ? parseFloat(wallet.balance) : 0;

    // Get total campaigns count
    const [campaignStats] = await db
      .select({
        totalCampaigns: sql<number>`count(*)::int`,
      })
      .from(campaigns)
      .where(eq(campaigns.teamId, teamId));

    // Get total impressions
    const [impressionStats] = await db
      .select({
        totalImpressions: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .innerJoin(campaigns, eq(adImpressions.campaignId, campaigns.id))
      .where(eq(campaigns.teamId, teamId));

    // Get top 3 performing campaigns by impressions
    const topCampaigns = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        impressions: sql<number>`count(${adImpressions.id})::int`,
      })
      .from(campaigns)
      .leftJoin(adImpressions, eq(campaigns.id, adImpressions.campaignId))
      .where(eq(campaigns.teamId, teamId))
      .groupBy(campaigns.id)
      .orderBy(desc(sql`count(${adImpressions.id})`))
      .limit(3);

    // Get top 3 performing ads by impressions
    const topAds = await db
      .select({
        id: ads.id,
        title: ads.title,
        campaignId: ads.campaignId,
        campaignName: campaigns.name,
        impressions: sql<number>`count(${adImpressions.id})::int`,
      })
      .from(ads)
      .leftJoin(adImpressions, eq(ads.id, adImpressions.adId))
      .innerJoin(campaigns, eq(ads.campaignId, campaigns.id))
      .where(eq(campaigns.teamId, teamId))
      .groupBy(ads.id, campaigns.id, campaigns.name)
      .orderBy(desc(sql`count(${adImpressions.id})`))
      .limit(3);

    // Get impressions over time (last 30 days, grouped by day)
    const impressionsOverTime = await db
      .select({
        date: sql<string>`DATE(${adImpressions.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .innerJoin(campaigns, eq(adImpressions.campaignId, campaigns.id))
      .where(
        and(
          eq(campaigns.teamId, teamId),
          sql`${adImpressions.createdAt} >= NOW() - INTERVAL '30 days'`
        )
      )
      .groupBy(sql`DATE(${adImpressions.createdAt})`)
      .orderBy(sql`DATE(${adImpressions.createdAt})`);

    return {
      totalCampaigns: campaignStats?.totalCampaigns || 0,
      availableBudget,
      totalImpressions: impressionStats?.totalImpressions || 0,
      topCampaigns: topCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        impressions: c.impressions || 0,
      })),
      topAds: topAds.map((a) => ({
        id: a.id,
        title: a.title,
        campaignId: a.campaignId,
        campaignName: a.campaignName,
        impressions: a.impressions || 0,
      })),
      impressionsOverTime: impressionsOverTime.map((item) => ({
        date: item.date,
        count: item.count || 0,
      })),
    };
  }

  /**
   * Get analytics for a specific campaign
   */
  static async getCampaignAnalytics(campaignId: number) {
    // Get campaign info
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get total impressions for this campaign
    const [impressionStats] = await db
      .select({
        totalImpressions: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .where(eq(adImpressions.campaignId, campaignId));

    // Get total ads in this campaign
    const [adStats] = await db
      .select({
        totalAds: sql<number>`count(*)::int`,
      })
      .from(ads)
      .where(eq(ads.campaignId, campaignId));

    // Get top performing ads for this campaign
    const topAds = await db
      .select({
        id: ads.id,
        title: ads.title,
        status: ads.status,
        impressions: sql<number>`count(${adImpressions.id})::int`,
      })
      .from(ads)
      .leftJoin(adImpressions, eq(ads.id, adImpressions.adId))
      .where(eq(ads.campaignId, campaignId))
      .groupBy(ads.id)
      .orderBy(desc(sql`count(${adImpressions.id})`))
      .limit(5);

    // Get impressions over time for this campaign (last 30 days)
    const impressionsOverTime = await db
      .select({
        date: sql<string>`DATE(${adImpressions.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .where(
        and(
          eq(adImpressions.campaignId, campaignId),
          sql`${adImpressions.createdAt} >= NOW() - INTERVAL '30 days'`
        )
      )
      .groupBy(sql`DATE(${adImpressions.createdAt})`)
      .orderBy(sql`DATE(${adImpressions.createdAt})`);

    const budget = campaign.budget ? parseFloat(campaign.budget) : 0;
    const spent = campaign.spent ? parseFloat(campaign.spent) : 0;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        budget,
        spent,
        remaining: budget - spent,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      },
      totalImpressions: impressionStats?.totalImpressions || 0,
      totalAds: adStats?.totalAds || 0,
      topAds: topAds.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        impressions: a.impressions || 0,
      })),
      impressionsOverTime: impressionsOverTime.map((item) => ({
        date: item.date,
        count: item.count || 0,
      })),
    };
  }

  /**
   * Get analytics for a specific ad
   */
  static async getAdAnalytics(adId: number) {
    // Get ad info with campaign details
    const [ad] = await db
      .select({
        id: ads.id,
        title: ads.title,
        description: ads.description,
        status: ads.status,
        budget: ads.budget,
        spent: ads.spent,
        campaignId: ads.campaignId,
        campaignName: campaigns.name,
        campaignBudget: campaigns.budget,
      })
      .from(ads)
      .innerJoin(campaigns, eq(ads.campaignId, campaigns.id))
      .where(eq(ads.id, adId))
      .limit(1);

    if (!ad) {
      throw new Error('Ad not found');
    }

    // Get total impressions for this ad
    const [impressionStats] = await db
      .select({
        totalImpressions: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .where(eq(adImpressions.adId, adId));

    // Get impressions by action type
    const impressionsByAction = await db
      .select({
        action: adImpressions.action,
        count: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .where(eq(adImpressions.adId, adId))
      .groupBy(adImpressions.action);

    // Get impressions by device type
    const impressionsByDevice = await db
      .select({
        deviceType: adImpressions.deviceType,
        count: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .where(eq(adImpressions.adId, adId))
      .groupBy(adImpressions.deviceType);

    // Get impressions over time for this ad (last 30 days)
    const impressionsOverTime = await db
      .select({
        date: sql<string>`DATE(${adImpressions.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(adImpressions)
      .where(
        and(
          eq(adImpressions.adId, adId),
          sql`${adImpressions.createdAt} >= NOW() - INTERVAL '30 days'`
        )
      )
      .groupBy(sql`DATE(${adImpressions.createdAt})`)
      .orderBy(sql`DATE(${adImpressions.createdAt})`);

    const budget = ad.budget ? parseFloat(ad.budget) : 0;
    const spent = ad.spent ? parseFloat(ad.spent) : 0;

    return {
      ad: {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        status: ad.status,
        budget,
        spent,
        remaining: budget > 0 ? budget - spent : 0,
        campaignId: ad.campaignId,
        campaignName: ad.campaignName,
        campaignBudget: ad.campaignBudget ? parseFloat(ad.campaignBudget) : 0,
      },
      totalImpressions: impressionStats?.totalImpressions || 0,
      impressionsByAction: impressionsByAction.map((item) => ({
        action: item.action,
        count: item.count || 0,
      })),
      impressionsByDevice: impressionsByDevice.map((item) => ({
        deviceType: item.deviceType || 'unknown',
        count: item.count || 0,
      })),
      impressionsOverTime: impressionsOverTime.map((item) => ({
        date: item.date,
        count: item.count || 0,
      })),
    };
  }
}
