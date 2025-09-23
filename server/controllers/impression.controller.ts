import { Request, Response } from 'express';
import { confirmImpressionRequestSchema } from '../schemas/adSchemas';
import { AdSelectorService } from '../db/services/adSelector.service';
import { verifyImpressionToken } from '../utils/token';
import { getClientIp, parseUserAgent } from '../utils/clientInfo';
import { db } from '../db/connect';
import { ads, campaigns } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export class ImpressionController {
  /**
   * Confirm an impression and handle billing
   * This endpoint processes impression events and deducts costs from budgets
   * Handles all event types: "served" | "clicked" | "completed" | "skipped"
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

      const { token, event, metadata, user_id, anon_id } = validation.data;

      // Validate that both user_id and anon_id are not provided
      if (user_id && anon_id) {
        return res.status(400).json({
          error: 'Cannot provide both user_id and anon_id',
        });
      }

      // Extract client information
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = getClientIp(req);
      const { os, deviceType } = parseUserAgent(userAgent);

      // Enhance metadata with extracted client info and optional user identification
      const enhancedMetadata = {
        ...metadata,
        userAgent,
        ipAddress,
        os,
        deviceType,
        user_id, // Pass along for potential impression record updates
        anon_id, // Pass along for potential impression record updates
      };

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

      // Check if impression has expired
      if (
        impression.status === 'expired' ||
        (impression.expiresAt && impression.expiresAt < new Date())
      ) {
        return res.status(410).json({
          error: 'Impression has expired',
        });
      }

      // Check for valid event transitions
      const currentStatus = impression.status || 'reserved';
      const validTransitions = ImpressionController.getValidEventTransitions(currentStatus);
      if (!validTransitions.includes(event)) {
        return res.status(400).json({
          error: `Invalid event transition from ${currentStatus} to ${event}`,
          validEvents: validTransitions,
        });
      }

      try {
        // Process the impression event
        const result = await AdSelectorService.confirmImpression(token, event, enhancedMetadata);

        const responseMessage = ImpressionController.getEventMessage(event);
        
        res.json({
          success: true,
          message: responseMessage,
        });
      } catch (error) {
        console.error(`Error processing ${event} event:`, error);
        res.status(500).json({
          success: false,
          message: `Failed to process ${event} event`,
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
   * Get valid event transitions based on current impression status
   */
  private static getValidEventTransitions(currentStatus: string): string[] {
    switch (currentStatus) {
      case 'reserved':
        return ['served']; // Only 'served' is valid from reserved
      case 'served':
        return ['clicked', 'completed', 'skipped']; // All interaction events are valid
      case 'confirmed':
        return []; // No further transitions allowed
      case 'expired':
      case 'cancelled':
        return []; // No transitions from terminal states
      default:
        return ['served']; // Default case
    }
  }

  /**
   * Get appropriate message for each event type
   */
  private static getEventMessage(event: string): string {
    switch (event) {
      case 'served':
        return 'Ad impression served and billed successfully';
      case 'clicked':
        return 'Ad click recorded successfully';
      case 'completed':
        return 'Ad view completion recorded successfully';
      case 'skipped':
        return 'Ad skip event recorded successfully';
      default:
        return `Ad event '${event}' recorded successfully`;
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

      // Return minimal information for debugging
      const safeImpression = {
        id: impression.id,
        adId: impression.adId,
        status: impression.status,
        action: impression.action,
        servedAt: impression.servedAt,
        confirmedAt: impression.confirmedAt,
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
