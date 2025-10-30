import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AnalyticsService } from '../db/services/analytics.service';
import { permission } from '@shared/constants';

export class AnalyticsController {
  /**
   * Get overall analytics for a team
   */
  static async getTeamAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamId } = req.params;

      // Check if user has permission to view analytics
      if (!req.userPermissions?.includes(permission.view_analytics)) {
        return res.status(403).json({ error: 'Insufficient permissions to view analytics' });
      }

      const analytics = await AnalyticsService.getTeamAnalytics(parseInt(teamId));

      res.json(analytics);
    } catch (error) {
      console.error('Get team analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch team analytics' });
    }
  }

  /**
   * Get analytics for a specific campaign
   */
  static async getCampaignAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { campaignId } = req.params;

      // Check if user has permission to view analytics
      if (!req.userPermissions?.includes(permission.view_analytics)) {
        return res.status(403).json({ error: 'Insufficient permissions to view analytics' });
      }

      const analytics = await AnalyticsService.getCampaignAnalytics(parseInt(campaignId));

      res.json(analytics);
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign analytics' });
    }
  }

  /**
   * Get analytics for a specific ad
   */
  static async getAdAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { adId } = req.params;

      // Check if user has permission to view analytics
      if (!req.userPermissions?.includes(permission.view_analytics)) {
        return res.status(403).json({ error: 'Insufficient permissions to view analytics' });
      }

      const analytics = await AnalyticsService.getAdAnalytics(parseInt(adId));

      res.json(analytics);
    } catch (error) {
      console.error('Get ad analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch ad analytics' });
    }
  }
}
