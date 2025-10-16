import { db } from '@server/db';
import { campaigns } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import { InsertCampaign, Campaign } from '@shared/types';

export class CampaignService {
  static async createCampaign(campaignData: InsertCampaign, createdBy: number) {
    // Ensure date fields are Date objects for the DB layer
    const dataToInsert = {
      ...campaignData,
      startDate: campaignData.startDate ? new Date(campaignData.startDate as any) : undefined,
      endDate: campaignData.endDate ? new Date(campaignData.endDate as any) : undefined,
      createdBy,
    };

    const [campaign] = await db
      .insert(campaigns)
      .values(dataToInsert)
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
    const updatesToApply = {
      ...updates,
      startDate: updates.startDate ? new Date(updates.startDate as any) : undefined,
      endDate: updates.endDate ? new Date(updates.endDate as any) : undefined,
    };

    const [campaign] = await db
      .update(campaigns)
      .set({
        ...updatesToApply,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return campaign;
  }

  static async deleteCampaign(campaignId: number) {
    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
  }

  /**
   * Update campaign spent amount (when ad budget is allocated)
   */
  static async updateCampaignSpent(campaignId: number, spentAmount: number) {
    const [campaign] = await db
      .update(campaigns)
      .set({
        spent: spentAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return campaign;
  }

  /**
   * Add to campaign spent amount (when ad budget is allocated)
   */
  static async addToCampaignSpent(campaignId: number, additionalSpent: number) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const currentSpent = parseFloat(campaign.spent || '0');
    const newSpent = currentSpent + additionalSpent;

    return this.updateCampaignSpent(campaignId, newSpent);
  }

  /**
   * Subtract from campaign spent amount (when ad budget is refunded)
   */
  static async subtractFromCampaignSpent(campaignId: number, refundAmount: number) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const currentSpent = parseFloat(campaign.spent || '0');
    const newSpent = Math.max(0, currentSpent - refundAmount);

    return this.updateCampaignSpent(campaignId, newSpent);
  }
}
