import { Router } from 'express';
import { AdsController } from '../controllers/ads.controller';
import { authenticate, checkTeamPermissions } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Team ads route (all ads across campaigns)
router.get('/teams/:teamId/ads', checkTeamPermissions, AdsController.getTeamAds);

// Ad budget info route
router.get(
  '/teams/:teamId/campaigns/:campaignId/ads/budget-info',
  checkTeamPermissions,
  AdsController.getAdBudgetInfo
);

// Ad CRUD routes
router.post(
  '/teams/:teamId/campaigns/:campaignId/ads',
  checkTeamPermissions,
  AdsController.createAd
);

router.get(
  '/teams/:teamId/campaigns/:campaignId/ads',
  checkTeamPermissions,
  AdsController.getCampaignAds
);

router.get(
  '/teams/:teamId/campaigns/:campaignId/ads/:adId',
  checkTeamPermissions,
  AdsController.getAd
);

router.put(
  '/teams/:teamId/campaigns/:campaignId/ads/:adId',
  checkTeamPermissions,
  AdsController.updateAd
);

router.delete(
  '/teams/:teamId/campaigns/:campaignId/ads/:adId',
  checkTeamPermissions,
  AdsController.deleteAd
);

export default router;