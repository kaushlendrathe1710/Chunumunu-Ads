import { Response } from 'express';
import { z } from 'zod';
import { CampaignService } from '../db/services/campaign.service';
import { WalletService } from '../db/services/wallet.service';
import { AuthenticatedRequest } from '../types';
import { permission } from '@shared/constants';

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

      // Deduct budget from wallet if specified and campaign is active
      if (validation.data.budget && validation.data.status === 'active') {
        await WalletService.deductCampaignBudget(
          userId,
          campaign.id,
          validation.data.budget.toString(),
          `Budget allocation for campaign: ${campaign.name}`
        );
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

      // Delete campaign and all its ads
      await CampaignService.deleteCampaign(parseInt(campaignId!));

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

      // Check wallet balance if ad budget is specified
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

      const ad = await CampaignService.createAd(
        {
          ...validation.data,
          budget: validation.data.budget?.toString(),
          campaignId: parseInt(campaignId!),
        },
        userId
      );

      // Deduct ad budget from wallet if specified and ad is active
      if (validation.data.budget && validation.data.status === 'active') {
        await WalletService.deductAdBudget(
          userId,
          ad.id,
          parseInt(campaignId!),
          validation.data.budget.toString(),
          `Budget allocation for ad: ${ad.title}`
        );
      }

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

      // Delete ad and clean up associated files
      await CampaignService.deleteAd(parseInt(adId!));

      // TODO: Delete associated files from S3 if needed
      // if (ad.videoUrl) {
      //   await deleteFromS3(extractS3KeyFromUrl(ad.videoUrl));
      // }
      // if (ad.thumbnailUrl) {
      //   await deleteFromS3(extractS3KeyFromUrl(ad.thumbnailUrl));
      // }

      // Refund unused budget if any
      if (refundAmount > 0) {
        await WalletService.refundAdBudget(
          userId,
          parseInt(adId!),
          parseInt(campaignId!),
          refundAmount.toString(),
          `Refund for deleted ad: ${ad.title}`
        );
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
