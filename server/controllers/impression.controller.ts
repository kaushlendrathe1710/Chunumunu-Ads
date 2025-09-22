import { Request, Response } from 'express';
import { confirmImpressionRequestSchema } from '../schemas/adSchemas';
import { AdSelectorService } from '../db/services/adSelector.service';
import { verifyImpressionToken } from '../utils/token';
import { db } from '../db/connect';
import { ads, campaigns } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export class ImpressionController {
  /**
   * Confirm an impression and handle billing
   * This endpoint processes impression events and deducts costs from budgets
   */
  static async confirmImpression(req: Request, res: Response) {
    try {
      // Validate the request body
      const validation = confirmImpressionRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { token, event, metadata } = validation.data;

      // Verify the impression token
      const tokenData = verifyImpressionToken(token);
      if (!tokenData) {
        return res.status(400).json({
          error: 'Invalid or expired impression token',
        });
      }

      // Get the impression record
      const impression = await AdSelectorService.getImpressionByToken(token);
      if (!impression) {
        return res.status(404).json({
          error: 'Impression not found',
        });
      }

      // Check if impression has already been confirmed or expired
      if (impression.status === 'confirmed') {
        return res.status(409).json({
          error: 'Impression already confirmed',
        });
      }

      if (
        impression.status === 'expired' ||
        (impression.expiresAt && impression.expiresAt < new Date())
      ) {
        return res.status(410).json({
          error: 'Impression has expired',
        });
      }

      // Only process billing for 'served' events
      // Other events like 'clicked', 'completed', 'skipped' can be tracked without billing
      if (event === 'served') {
        try {
          await AdSelectorService.confirmImpression(token, event, metadata);

          res.json({
            success: true,
            message: 'Impression confirmed and billed successfully',
            billingDetails: {
              costCents: impression.costCents || 0,
              remainingBudget: 0, // TODO: Calculate remaining budget
            },
          });
        } catch (error) {
          console.error('Billing error:', error);
          res.status(500).json({
            success: false,
            message: 'Failed to process billing for impression',
          });
        }
      } else {
        // For non-billing events, just update the impression status
        await AdSelectorService.confirmImpression(token, event, metadata);

        res.json({
          success: true,
          message: `Impression event '${event}' recorded successfully`,
        });
      }
    } catch (error) {
      console.error('Confirm impression error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm impression',
      });
    }
  }

  /**
   * Get impression details by token (for debugging/analytics)
   */
  static async getImpression(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          error: 'Impression token is required',
        });
      }

      const impression = await AdSelectorService.getImpressionByToken(token);
      if (!impression) {
        return res.status(404).json({
          error: 'Impression not found',
        });
      }

      // Don't expose sensitive information in the response
      const safeImpression = {
        id: impression.id,
        adId: impression.adId,
        campaignId: impression.campaignId,
        status: impression.status,
        costCents: impression.costCents,
        expiresAt: impression.expiresAt,
        servedAt: impression.servedAt,
        confirmedAt: impression.confirmedAt,
        createdAt: impression.createdAt,
      };

      res.json(safeImpression);
    } catch (error) {
      console.error('Get impression error:', error);
      res.status(500).json({
        error: 'Failed to get impression details',
      });
    }
  }
}
