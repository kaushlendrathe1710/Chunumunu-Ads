import { db } from '@server/db';
import { campaigns, ads } from '@server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { InsertAd, Ad, AdBudgetInfo, CampaignBudgetValidation } from '@shared/types';

export class AdsService {
  /**
   * Create a new ad
   */
  static async createAd(adData: InsertAd, createdBy: number): Promise<Ad> {
    const [ad] = await db
      .insert(ads)
      .values({
        ...adData,
        createdBy,
      })
      .returning();

    return ad;
  }

  /**
   * Get ad by ID with related data
   */
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

  /**
   * Get all ads for a specific campaign
   */
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

  /**
   * Get all ads for a team (across all campaigns)
   */
  static async getTeamAds(teamId: number): Promise<Ad[]> {
    const result = await db.query.ads.findMany({
      where: (ads, { exists, eq }) => 
        exists(
          db.select().from(campaigns).where(
            and(
              eq(campaigns.id, ads.campaignId),
              eq(campaigns.teamId, teamId)
            )
          )
        ),
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

  /**
   * Update an ad
   */
  static async updateAd(adId: number, updates: Partial<InsertAd>): Promise<Ad | null> {
    const [ad] = await db
      .update(ads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(ads.id, adId))
      .returning();

    return ad || null;
  }

  /**
   * Delete an ad
   */
  static async deleteAd(adId: number): Promise<void> {
    await db.delete(ads).where(eq(ads.id, adId));
  }

  /**
   * Validate if ad budget fits within campaign budget constraints
   */
  static async validateAdBudget(
    campaignId: number,
    requestedBudget?: number
  ): Promise<CampaignBudgetValidation> {
    // Get campaign details
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (!campaign) {
      return {
        isValid: false,
        campaignBudget: 0,
        allocatedBudget: 0,
        remainingBudget: 0,
        error: 'Campaign not found',
      };
    }

    const campaignBudget = parseFloat(campaign.budget || '0');

    // If no campaign budget is set, allow unlimited ad creation (or set to -1)
    if (!campaign.budget || campaignBudget <= 0) {
      return {
        isValid: true,
        campaignBudget: 0,
        allocatedBudget: 0,
        remainingBudget: -1, // Unlimited
      };
    }

    // Calculate currently allocated budget from existing ads
    const existingAds = await this.getCampaignAds(campaignId);
    const allocatedBudget = existingAds.reduce((sum, ad) => {
      return sum + parseFloat(ad.budget || '0');
    }, 0);

    const remainingBudget = campaignBudget - allocatedBudget;

    // If no specific budget requested (budget = -1), it's valid
    if (requestedBudget === undefined || requestedBudget === -1) {
      return {
        isValid: true,
        campaignBudget,
        allocatedBudget,
        remainingBudget,
      };
    }

    // Check if requested budget fits
    if (requestedBudget > remainingBudget) {
      return {
        isValid: false,
        campaignBudget,
        allocatedBudget,
        remainingBudget,
        error: 'Insufficient remaining campaign budget',
      };
    }

    return {
      isValid: true,
      campaignBudget,
      allocatedBudget,
      remainingBudget,
    };
  }

  /**
   * Get budget information for an ad creation
   */
  static async getAdBudgetInfo(
    campaignId: number,
    requestedBudget?: number
  ): Promise<AdBudgetInfo> {
    const validation = await this.validateAdBudget(campaignId, requestedBudget);

    return {
      campaignBudget: validation.campaignBudget,
      allocatedBudget: validation.allocatedBudget,
      remainingBudget: validation.remainingBudget,
      requestedBudget,
    };
  }

  /**
   * Calculate total spent across all ads in a campaign
   */
  static async getCampaignAdSpent(campaignId: number): Promise<number> {
    const campaignAds = await this.getCampaignAds(campaignId);
    return campaignAds.reduce((total, ad) => {
      return total + parseFloat(ad.spent || '0');
    }, 0);
  }
}
