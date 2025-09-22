import { Router } from 'express';
import { AdsController } from '../controllers/ads.controller';
import { authenticate, checkTeamPermissions } from '../middleware/auth.middleware';

const router = Router();

// Team ads route (all ads across campaigns)
router.get('/teams/:teamId/ads', authenticate, checkTeamPermissions, AdsController.getTeamAds);

// Ad budget info route
router.get(
  '/teams/:teamId/campaigns/:campaignId/ads/budget-info',
  authenticate,
  checkTeamPermissions,
  AdsController.getAdBudgetInfo
);

// Ad CRUD routes
router.post(
  '/teams/:teamId/campaigns/:campaignId/ads',
  authenticate,
  checkTeamPermissions,
  AdsController.createAd
);

router.get(
  '/teams/:teamId/campaigns/:campaignId/ads',
  authenticate,
  checkTeamPermissions,
  AdsController.getCampaignAds
);

router.get(
  '/teams/:teamId/campaigns/:campaignId/ads/:adId',
  authenticate,
  checkTeamPermissions,
  AdsController.getAd
);

router.put(
  '/teams/:teamId/campaigns/:campaignId/ads/:adId',
  authenticate,
  checkTeamPermissions,
  AdsController.updateAd
);

router.delete(
  '/teams/:teamId/campaigns/:campaignId/ads/:adId',
  authenticate,
  checkTeamPermissions,
  AdsController.deleteAd
);

export default router;
