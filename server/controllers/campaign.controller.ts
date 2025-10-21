import { Response } from 'express';
import { z } from 'zod';
import { CampaignService } from '../db/services/campaign.service';
import { AdsService } from '../db/services/ads.service';
import { WalletService } from '../db/services/wallet.service';
import { AuthenticatedRequest } from '../types';
import { permission } from '@shared/constants';
import { deleteFileFromS3 } from '../config/s3';
// Additional imports for new allocation / refund logic
import { db, TeamService, userService } from '@server/db';
import { transactions } from '@server/db/schema/wallet.schema';
import { and, eq } from 'drizzle-orm';

// Create campaign schema without teamId
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  budget: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      return false;
    }
    
    if (endDate <= startDate) {
      return false;
    }
  }
  return true;
}, {
  message: 'Invalid date range: start date cannot be in the past and end date must be after start date',
});

// Update campaign schema - override to accept budget as number (consistent with create)
const updateCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  description: z.string().optional(),
  budget: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
}).partial().refine((data) => {
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      return false;
    }
    
    if (endDate <= startDate) {
      return false;
    }
  }
  return true;
}, {
  message: 'Invalid date range: start date cannot be in the past and end date must be after start date',
});

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

      const team = await TeamService.getTeamById(parseInt(teamId!));
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user has permission to create campaigns
      if (!req.userPermissions?.includes(permission.create_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Check wallet balance if budget is specified
      if (validation.data.budget) {
        const wallet = await WalletService.getOrCreateWallet(team.ownerId);
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

      // Always deduct full campaign budget from team owner's wallet upon creation (allocation phase)
      if (validation.data.budget) {
        try {
          await WalletService.deductCampaignBudget(
            team.ownerId, // Use team owner's wallet, not current user's wallet
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

  static async getTeamWalletBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId } = req.params;

      // Check if user has permission to view campaigns (needed for campaign creation)
      if (!req.userPermissions?.includes(permission.view_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get team to access owner's wallet
      const team = await TeamService.getTeamById(parseInt(teamId!));
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Get team owner's wallet balance
      const wallet = await WalletService.getOrCreateWallet(team.ownerId);

      res.json({
        balance: wallet.balance,
        currency: wallet.currency,
        teamId: team.id,
        teamName: team.name,
      });
    } catch (error) {
      console.error('Get team wallet balance error:', error);
      res.status(500).json({ error: 'Failed to fetch team wallet balance' });
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
      const userId = req.user!.id;

      // Check if user has permission to edit campaigns
      if (!req.userPermissions?.includes(permission.edit_campaign)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get the current campaign to compare budget changes
      const currentCampaign = await CampaignService.getCampaignById(parseInt(campaignId!));
      if (!currentCampaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Get team to access owner's wallet
      const team = await TeamService.getTeamById(parseInt(teamId!));
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Handle budget changes with wallet balance validation
      if (validation.data.budget !== undefined) {
        const currentBudget = parseFloat(currentCampaign.budget || '0');
        const newBudget = Number(validation.data.budget) || 0;
        const budgetDifference = newBudget - currentBudget;

        if (budgetDifference > 0) {
          // Increasing budget - check wallet balance and deduct difference
          const wallet = await WalletService.getOrCreateWallet(team.ownerId);
          const walletBalance = parseFloat(wallet.balance);

          if (walletBalance < budgetDifference) {
            return res.status(400).json({
              error: 'Insufficient wallet balance for budget increase',
              required: budgetDifference,
              available: walletBalance,
            });
          }

          // Deduct the additional amount from team owner's wallet
          await WalletService.deductCampaignBudget(
            team.ownerId, // Use team owner's wallet
            parseInt(campaignId!),
            budgetDifference.toString(),
            `Budget increase for campaign: ${currentCampaign.name}`
          );
        } else if (budgetDifference < 0) {
          // Decreasing budget - refund the difference to team owner's wallet
          const refundAmount = Math.abs(budgetDifference);
          await WalletService.refundCampaignBudget(
            team.ownerId, // Use team owner's wallet
            parseInt(campaignId!),
            refundAmount.toString(),
            `Budget decrease refund for campaign: ${currentCampaign.name}`
          );
        }
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

      if (error instanceof Error && error.message === 'Insufficient balance') {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }

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

      // Get team to access owner's wallet
      const team = await TeamService.getTeamById(parseInt(teamId!));
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Calculate refund amount (budget - spent)
      const budgetAmount = parseFloat(campaign.budget || '0');
      const spentAmount = parseFloat(campaign.spent || '0');
      const refundAmount = budgetAmount - spentAmount;

      // Fetch ads for S3 cleanup before DB deletion
      const campaignAds = await AdsService.getCampaignAds(parseInt(campaignId!));

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

      // Refund unused budget to team owner's wallet if any
      if (refundAmount > 0) {
        await WalletService.refundCampaignBudget(
          team.ownerId, // Refund to team owner's wallet
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
}
