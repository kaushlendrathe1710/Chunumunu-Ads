import { Response } from 'express';
import { z } from 'zod';
import { CampaignService } from '../db/services/campaign.service';
import { WalletService } from '../db/services/wallet.service';
import { AuthenticatedRequest } from '../types';
import { permission } from '@shared/constants';
import { deleteFileFromS3 } from '../config/s3';
// Additional imports for new allocation / refund logic
import { db } from '@server/db';
import { ads } from '@server/db/schema';
import { transactions } from '@server/db/schema/wallet.schema';
import { and, eq } from 'drizzle-orm';

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100),
  description: z.string().optional(),
  budget: z.number().positive('Budget must be positive'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
});

const updateCampaignSchema = createCampaignSchema.partial();

const createAdSchema = z.object({
  title: z.string().min(1, 'Ad title is required').max(100),
  description: z.string().optional(),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  tags: z.array(z.string()).optional().default([]),
  ctaLink: z.string().url().optional(),
  videoUrl: z.string().url('Valid video URL is required'),
  thumbnailUrl: z.string().url('Valid thumbnail URL is required'),
  budget: z.number().positive('Ad budget must be positive').optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
});

const updateAdSchema = createAdSchema.partial();

export class CampaignController {
  // Campaign methods
  static async createCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = createCampaignSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { teamId } = req.params;
      const userId = req.user!.id;

      // Check if user has permission to create campaigns
      if (!req.userPermissions?.includes(permission.create_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Check wallet balance if budget is specified
      if (validation.data.budget) {
        const wallet = await WalletService.getOrCreateWallet(userId);
        const walletBalance = parseFloat(wallet.balance);

        if (walletBalance < validation.data.budget) {
          return res.status(400).json({
            error: 'Insufficient wallet balance',
            required: validation.data.budget,
            available: walletBalance,
          });
        }
      }

      const campaign = await CampaignService.createCampaign(
        {
          ...validation.data,
          budget: validation.data.budget?.toString(),
          startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
          endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
          teamId: parseInt(teamId!),
        },
        userId
      );

      // Always deduct full campaign budget from wallet upon creation (allocation phase)
      if (validation.data.budget) {
        try {
          await WalletService.deductCampaignBudget(
            userId,
            campaign.id,
            validation.data.budget.toString(),
            `Budget allocation for campaign: ${campaign.name}`
          );
        } catch (e) {
          // If debit fails (e.g., race condition draining wallet) roll back campaign
          try {
            await CampaignService.deleteCampaign(campaign.id);
          } catch (_) {
            /* swallow */
          }
          if (e instanceof Error && e.message === 'Insufficient balance') {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
          }
          return res.status(500).json({ error: 'Failed to allocate campaign budget' });
        }
      }

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Create campaign error:', error);

      if (error instanceof Error && error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }

      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }

  static async getCampaigns(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId } = req.params;
      const { page = '1', limit = '10', status } = req.query;

      // Check if user has permission to view campaigns
      if (!req.userPermissions?.includes(permission.view_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const campaigns = await CampaignService.getTeamCampaigns(parseInt(teamId!));

      res.json({ campaigns });
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }

  static async getCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId } = req.params;

      // Check if user has permission to view campaigns
      if (!req.userPermissions?.includes(permission.view_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const campaign = await CampaignService.getCampaignById(parseInt(campaignId!));
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  }

  static async updateCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = updateCampaignSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { teamId, campaignId } = req.params;

      // Check if user has permission to edit campaigns
      if (!req.userPermissions?.includes(permission.edit_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updateData = {
        ...validation.data,
        budget: validation.data.budget?.toString(),
        startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
        endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
      };

      const campaign = await CampaignService.updateCampaign(parseInt(campaignId!), updateData);

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  }

  static async deleteCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId } = req.params;
      const userId = req.user!.id;

      // Check if user has permission to delete campaigns
      if (!req.userPermissions?.includes(permission.delete_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get campaign details before deletion for refund calculation
      const campaign = await CampaignService.getCampaignById(parseInt(campaignId!));
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Calculate refund amount (budget - spent)
      const budgetAmount = parseFloat(campaign.budget || '0');
      const spentAmount = parseFloat(campaign.spent || '0');
      const refundAmount = budgetAmount - spentAmount;

      // Fetch ads for S3 cleanup before DB deletion
      const campaignAds = await CampaignService.getCampaignAds(parseInt(campaignId!));

      // Delete campaign and all its ads (DB cascade handles ads rows)
      await CampaignService.deleteCampaign(parseInt(campaignId!));

      // Best-effort S3 cleanup (non-blocking errors)
      for (const ad of campaignAds) {
        try {
          if (ad.videoUrl) {
            await deleteFileFromS3(ad.videoUrl);
          }
          if (ad.thumbnailUrl) {
            await deleteFileFromS3(ad.thumbnailUrl);
          }
        } catch (e) {
          console.warn('Failed to delete ad assets from S3 during campaign deletion', e);
        }
      }

      // Refund unused budget if any
      if (refundAmount > 0) {
        await WalletService.refundCampaignBudget(
          userId,
          parseInt(campaignId!),
          refundAmount.toString(),
          `Refund for deleted campaign: ${campaign.name}`
        );
      }

      res.json({
        message: 'Campaign deleted successfully',
        refundAmount: refundAmount > 0 ? refundAmount : 0,
      });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  // Ad methods
  static async createAd(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = createAdSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { teamId, campaignId } = req.params;
      const userId = req.user!.id;

      // Check if user has permission to create ads
      if (!req.userPermissions?.includes(permission.create_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Fetch campaign to validate allocation capacity
      const campaign = await CampaignService.getCampaignById(parseInt(campaignId!));
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // If ad has a budget we ensure it fits inside the campaign's remaining allocation.
      if (validation.data.budget && campaign.budget) {
        const campaignBudget = parseFloat(campaign.budget || '0');
        // Sum existing ad budgets (allocation already done at campaign level so no wallet debit here)
        const existingAds = await CampaignService.getCampaignAds(parseInt(campaignId!));
        const allocated = existingAds.reduce((sum, a) => sum + parseFloat(a.budget || '0'), 0);
        if (allocated + validation.data.budget > campaignBudget) {
          return res.status(400).json({
            error: 'Insufficient remaining campaign budget',
            allocated,
            requested: validation.data.budget,
            total: campaignBudget,
            remaining: campaignBudget - allocated,
          });
        }
      }

      const ad = await CampaignService.createAd(
        {
          ...validation.data,
          budget: validation.data.budget?.toString(),
          campaignId: parseInt(campaignId!),
        },
        userId
      );
      // Ad creation no longer triggers a separate wallet debit. The campaign-level allocation covers ad budgets.

      res.status(201).json(ad);
    } catch (error) {
      console.error('Create ad error:', error);

      if (error instanceof Error && error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }

      res.status(500).json({ error: 'Failed to create ad' });
    }
  }

  static async getAds(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId } = req.params;
      const { page = '1', limit = '10', status } = req.query;

      // Check if user has permission to view ads
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const ads = await CampaignService.getCampaignAds(parseInt(campaignId!));

      res.json(ads);
    } catch (error) {
      console.error('Get ads error:', error);
      res.status(500).json({ error: 'Failed to fetch ads' });
    }
  }

  static async getTeamAds(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId } = req.params;

      // Check if user has permission to view ads
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const ads = await CampaignService.getTeamAds(parseInt(teamId!));

      res.json({ ads });
    } catch (error) {
      console.error('Get team ads error:', error);
      res.status(500).json({ error: 'Failed to fetch team ads' });
    }
  }

  static async getAd(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId, adId } = req.params;

      // Check if user has permission to view ads
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const ad = await CampaignService.getAdById(parseInt(adId!));
      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      res.json(ad);
    } catch (error) {
      console.error('Get ad error:', error);
      res.status(500).json({ error: 'Failed to fetch ad' });
    }
  }

  static async updateAd(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = updateAdSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { teamId, campaignId, adId } = req.params;

      // Check if user has permission to edit ads
      if (!req.userPermissions?.includes(permission.edit_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updateData = {
        ...validation.data,
        budget: validation.data.budget?.toString(),
      };

      const ad = await CampaignService.updateAd(parseInt(adId!), updateData);

      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      res.json(ad);
    } catch (error) {
      console.error('Update ad error:', error);
      res.status(500).json({ error: 'Failed to update ad' });
    }
  }

  static async deleteAd(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId, adId } = req.params;
      const userId = req.user!.id;

      // Check if user has permission to delete ads
      if (!req.userPermissions?.includes(permission.delete_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get ad details before deletion for refund calculation
      const ad = await CampaignService.getAdById(parseInt(adId!));
      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      // Calculate refund amount (budget - spent)
      const budgetAmount = parseFloat(ad.budget || '0');
      const spentAmount = parseFloat(ad.spent || '0');
      const refundAmount = budgetAmount - spentAmount;

      // Delete ad (DB)
      await CampaignService.deleteAd(parseInt(adId!));

      // Attempt S3 cleanup (ignore failures)
      try {
        if (ad.videoUrl) {
          await deleteFileFromS3(ad.videoUrl);
        }
        if (ad.thumbnailUrl) {
          await deleteFileFromS3(ad.thumbnailUrl);
        }
      } catch (e) {
        console.warn('Failed to delete ad media from S3', e);
      }

      // Only refund to wallet if there was an original wallet debit for this ad (legacy ads before allocation change)
      if (refundAmount > 0) {
        const legacyDebit = await db.query.transactions.findFirst({
          where: and(
            eq(transactions.adId, ad.id),
            eq(transactions.type, 'debit'),
            eq(transactions.status, 'completed')
          ),
        });
        if (legacyDebit) {
          await WalletService.refundAdBudget(
            userId,
            parseInt(adId!),
            parseInt(campaignId!),
            refundAmount.toString(),
            `Refund for deleted ad: ${ad.title}`
          );
        }
      }

      res.json({
        message: 'Ad deleted successfully',
        refundAmount: refundAmount > 0 ? refundAmount : 0,
      });
    } catch (error) {
      console.error('Delete ad error:', error);
      res.status(500).json({ error: 'Failed to delete ad' });
    }
  }

  // Analytics methods (placeholder implementations)
  static async getCampaignAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId } = req.params;
      const { startDate, endDate } = req.query;

      // Check if user has permission to view campaigns (using campaign view for analytics)
      if (!req.userPermissions?.includes(permission.view_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Placeholder analytics data
      const analytics = {
        campaignId: parseInt(campaignId!),
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        dateRange: { startDate, endDate },
      };

      res.json(analytics);
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  static async getAdAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId, adId } = req.params;
      const { startDate, endDate } = req.query;

      // Check if user has permission to view ads (using ad view for analytics)
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Placeholder analytics data
      const analytics = {
        adId: parseInt(adId!),
        campaignId: parseInt(campaignId!),
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        dateRange: { startDate, endDate },
      };

      res.json(analytics);
    } catch (error) {
      console.error('Get ad analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
}
