import { Response, Request } from 'express';
import { z } from 'zod';
import { AdsService } from '../db/services/ads.service';
import { CampaignService } from '../db/services/campaign.service';
import { AdSelectorService } from '../db/services/adSelector.service';
import { AuthenticatedRequest } from '../types';
import { permission, adBudget } from '@shared/constants';
import { insertAdSchema, updateAdSchema } from '@shared/types';
import { deleteFileFromS3 } from '../config/s3';
import { serveAdRequestSchema } from '../schemas/adSchemas';
import { getClientIp, parseUserAgent } from '../utils/clientInfo';

export class AdsController {
  /**
   * Create a new ad with budget validation and permission checks
   */
  static async createAd(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = insertAdSchema.safeParse(req.body);
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

      // Validate campaign exists
      const campaign = await CampaignService.getCampaignById(parseInt(campaignId!));
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Validate budget constraints
      const requestedBudget = validation.data.budget
        ? parseFloat(validation.data.budget)
        : undefined;
      const budgetValidation = await AdsService.validateAdBudget(
        parseInt(campaignId!),
        requestedBudget
      );

      if (!budgetValidation.isValid) {
        return res.status(400).json({
          error: budgetValidation.error,
          budgetInfo: {
            campaignBudget: budgetValidation.campaignBudget,
            allocatedBudget: budgetValidation.allocatedBudget,
            remainingBudget: budgetValidation.remainingBudget,
            requestedBudget,
          },
        });
      }

      // Set budget to -1 if not specified (unlimited until campaign budget exhausted)
      const finalBudget =
        requestedBudget !== undefined ? requestedBudget.toString() : adBudget.unlimited.toString();

      const ad = await AdsService.createAd(
        {
          ...validation.data,
          budget: finalBudget,
          campaignId: parseInt(campaignId!),
        },
        userId
      );

      // Deduct ad budget from campaign spent amount (similar to how campaign deducts from wallet)
      if (requestedBudget && requestedBudget > 0) {
        try {
          await CampaignService.addToCampaignSpent(parseInt(campaignId!), requestedBudget);
        } catch (budgetError) {
          // If campaign budget update fails, clean up the ad
          await AdsService.deleteAd(ad.id);
          console.error('Campaign budget deduction failed:', budgetError);
          return res.status(500).json({
            error: 'Failed to allocate budget from campaign',
          });
        }
      }

      res.status(201).json(ad);
    } catch (error) {
      console.error('Create ad error:', error);
      res.status(500).json({ error: 'Failed to create ad' });
    }
  }

  /**
   * Get all ads for a specific campaign
   */
  static async getCampaignAds(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId } = req.params;

      // Check if user has permission to view ads
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const ads = await AdsService.getCampaignAds(parseInt(campaignId!));

      res.json(ads);
    } catch (error) {
      console.error('Get campaign ads error:', error);
      res.status(500).json({ error: 'Failed to fetch ads' });
    }
  }

  /**
   * Get all ads for a team (across all campaigns)
   */
  static async getTeamAds(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId } = req.params;

      // Check if user has permission to view ads
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const ads = await AdsService.getTeamAds(parseInt(teamId!));

      res.json({ ads });
    } catch (error) {
      console.error('Get team ads error:', error);
      res.status(500).json({ error: 'Failed to fetch team ads' });
    }
  }

  /**
   * Get a specific ad by ID
   */
  static async getAd(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId, adId } = req.params;

      // Check if user has permission to view ads
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const ad = await AdsService.getAdById(parseInt(adId!));
      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      res.json(ad);
    } catch (error) {
      console.error('Get ad error:', error);
      res.status(500).json({ error: 'Failed to fetch ad' });
    }
  }

  /**
   * Update an existing ad
   */
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

      // If budget is being updated, validate it
      if (validation.data.budget !== undefined) {
        const requestedBudget = validation.data.budget
          ? parseFloat(validation.data.budget)
          : undefined;

        // Get current ad to exclude its budget from allocation calculation
        const currentAd = await AdsService.getAdById(parseInt(adId!));
        if (!currentAd) {
          return res.status(404).json({ error: 'Ad not found' });
        }

        // For budget validation, we need to exclude current ad's budget from allocated amount
        const allCampaignAds = await AdsService.getCampaignAds(parseInt(campaignId!));
        const otherAdsAllocated = allCampaignAds
          .filter((ad) => ad.id !== parseInt(adId!))
          .reduce((sum, ad) => sum + parseFloat(ad.budget || '0'), 0);

        // Get campaign budget
        const campaign = await CampaignService.getCampaignById(parseInt(campaignId!));
        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaignBudget = parseFloat(campaign.budget || '0');
        const availableBudget = campaignBudget - otherAdsAllocated;

        if (requestedBudget && requestedBudget > availableBudget) {
          return res.status(400).json({
            error: 'Insufficient remaining campaign budget',
            budgetInfo: {
              campaignBudget,
              allocatedBudget: otherAdsAllocated,
              remainingBudget: availableBudget,
              requestedBudget,
            },
          });
        }
      }

      const updateData = {
        ...validation.data,
        budget: validation.data.budget?.toString(),
      };

      // Handle budget change and campaign allocation update
      if (validation.data.budget !== undefined) {
        const currentAd = await AdsService.getAdById(parseInt(adId!));
        if (!currentAd) {
          return res.status(404).json({ error: 'Ad not found' });
        }

        const oldBudget = parseFloat(currentAd.budget || '0');
        const newBudget = validation.data.budget ? parseFloat(validation.data.budget) : 0;
        const budgetDifference = newBudget - oldBudget;

        // Update the ad
        const ad = await AdsService.updateAd(parseInt(adId!), updateData);

        // Update campaign spent amount based on budget change
        if (budgetDifference !== 0) {
          try {
            if (budgetDifference > 0) {
              await CampaignService.addToCampaignSpent(parseInt(campaignId!), budgetDifference);
            } else {
              await CampaignService.subtractFromCampaignSpent(
                parseInt(campaignId!),
                Math.abs(budgetDifference)
              );
            }
          } catch (budgetError) {
            console.error('Campaign budget update failed:', budgetError);
            // Note: Ad is already updated, but budget allocation failed
            // In a real-world scenario, you might want to implement compensation logic
          }
        }

        return res.json(ad);
      }

      const ad = await AdsService.updateAd(parseInt(adId!), updateData);

      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      res.json(ad);
    } catch (error) {
      console.error('Update ad error:', error);
      res.status(500).json({ error: 'Failed to update ad' });
    }
  }

  /**
   * Delete an ad
   */
  static async deleteAd(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId, adId } = req.params;

      // Check if user has permission to delete ads
      if (!req.userPermissions?.includes(permission.delete_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get ad details before deletion for cleanup and refund calculation
      const ad = await AdsService.getAdById(parseInt(adId!));
      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      // Calculate potential refund amount (budget - spent)
      const budgetAmount = parseFloat(ad.budget || '0');
      const spentAmount = parseFloat(ad.spent || '0');
      const refundAmount = budgetAmount > 0 ? Math.max(0, budgetAmount - spentAmount) : 0;

      // Delete ad from database
      await AdsService.deleteAd(parseInt(adId!));

      // Return unused budget back to campaign (decrease campaign spent amount)
      if (budgetAmount > 0) {
        try {
          await CampaignService.subtractFromCampaignSpent(parseInt(campaignId!), budgetAmount);
        } catch (budgetError) {
          console.error('Campaign budget refund failed:', budgetError);
          // Ad is already deleted, but budget wasn't refunded to campaign
        }
      }

      // Best-effort cleanup of S3 assets (non-blocking)
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

      res.json({
        message: 'Ad deleted successfully',
        refundAmount,
      });
    } catch (error) {
      console.error('Delete ad error:', error);
      res.status(500).json({ error: 'Failed to delete ad' });
    }
  }

  /**
   * Get budget information for ad creation
   */
  static async getAdBudgetInfo(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId, campaignId } = req.params;
      const { requestedBudget } = req.query;

      // Check if user has permission to view ads (needed for budget info)
      if (!req.userPermissions?.includes(permission.view_ad)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const budget = requestedBudget ? parseFloat(requestedBudget as string) : undefined;
      const budgetInfo = await AdsService.getAdBudgetInfo(parseInt(campaignId!), budget);

      res.json(budgetInfo);
    } catch (error) {
      console.error('Get ad budget info error:', error);
      res.status(500).json({ error: 'Failed to fetch budget information' });
    }
  }

  /**
   * Serve an ad based on content context and user targeting
   * This is a public endpoint that doesn't require authentication
   * 
   * Request body should include:
   * - For authenticated users: user_id (and optionally anon_id for session continuity)
   * - For anonymous users: anon_id
   * - videoId, category, tags (required)
   * - sessionId (optional)
   */
  static async serveAd(req: Request, res: Response) {
    try {
      // Validate the request body
      const validation = serveAdRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const requestData = validation.data;

      // Extract user agent and IP address for impression tracking
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = getClientIp(req);

      // Parse user agent for device information
      const { os, deviceType } = parseUserAgent(userAgent);

      // Serve the ad using the ad selector service
      const result = await AdSelectorService.serveAd(
        requestData, 
        userAgent, 
        ipAddress,
        { os, deviceType }
      );

      if ('reason' in result) {
        // No eligible ads found
        return res.status(204).json(result);
      }

      // Return the ad and impression details
      res.json(result);
    } catch (error) {
      console.error('Serve ad error:', error);
      res.status(500).json({
        error: 'Failed to serve ad',
        reason: 'internal_error',
      });
    }
  }
}
