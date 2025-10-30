import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, checkTeamPermissions } from '../middleware/auth.middleware';

const router = Router();

// Team analytics
router.get(
  '/teams/:teamId/analytics',
  authenticate,
  checkTeamPermissions,
  AnalyticsController.getTeamAnalytics
);

// Campaign analytics
router.get(
  '/teams/:teamId/campaigns/:campaignId/analytics',
  authenticate,
  checkTeamPermissions,
  AnalyticsController.getCampaignAnalytics
);

// Ad analytics
router.get(
  '/teams/:teamId/campaigns/:campaignId/ads/:adId/analytics',
  authenticate,
  checkTeamPermissions,
  AnalyticsController.getAdAnalytics
);

export default router;
