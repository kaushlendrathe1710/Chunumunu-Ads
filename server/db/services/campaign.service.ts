import { db } from '@server/db';
import { campaigns, ads } from '@server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { InsertCampaign, Campaign, InsertAd, Ad } from '@shared/types';

export class CampaignService {
  static async createCampaign(campaignData: InsertCampaign, createdBy: number) {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        ...campaignData,
        createdBy,
      })
      .returning();

    return campaign;
  }

  static async getCampaignById(campaignId: number): Promise<Campaign | null> {
    const result = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        team: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return result || null;
  }

  static async getTeamCampaigns(teamId: number): Promise<Campaign[]> {
    const result = await db.query.campaigns.findMany({
      where: eq(campaigns.teamId, teamId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        team: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
    });

    return result;
  }

  static async updateCampaign(campaignId: number, updates: Partial<InsertCampaign>) {
    const [campaign] = await db
      .update(campaigns)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return campaign;
  }

  static async deleteCampaign(campaignId: number) {
    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
  }

  // Ad methods
  static async createAd(adData: InsertAd, createdBy: number) {
    const [ad] = await db
      .insert(ads)
      .values({
        ...adData,
        createdBy,
      })
      .returning();

    return ad;
  }

  static async getAdById(adId: number): Promise<Ad | null> {
    const result = await db.query.ads.findFirst({
      where: eq(ads.id, adId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        campaign: {
          columns: {
            id: true,
            name: true,
            teamId: true,
          },
        },
      },
    });

    return result || null;
  }

  static async getCampaignAds(campaignId: number): Promise<Ad[]> {
    const result = await db.query.ads.findMany({
      where: eq(ads.campaignId, campaignId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        campaign: {
          columns: {
            id: true,
            name: true,
            teamId: true,
          },
        },
      },
      orderBy: (ads, { desc }) => [desc(ads.createdAt)],
    });

    return result;
  }

  static async updateAd(adId: number, updates: Partial<InsertAd>) {
    const [ad] = await db
      .update(ads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(ads.id, adId))
      .returning();

    return ad;
  }

  static async deleteAd(adId: number) {
    await db.delete(ads).where(eq(ads.id, adId));
  }

  // Get all ads for a team (across all campaigns)
  static async getTeamAds(teamId: number): Promise<Ad[]> {
    const result = await db
      .select()
      .from(ads)
      .innerJoin(campaigns, eq(ads.campaignId, campaigns.id))
      .where(eq(campaigns.teamId, teamId))
      .orderBy(desc(ads.createdAt));

    // Transform the result to match the Ad type with campaign info
    return result.map((row) => ({
      ...row.ads,
      campaign: {
        id: row.campaigns.id,
        name: row.campaigns.name,
        teamId: row.campaigns.teamId,
      },
    }));
  }
}
