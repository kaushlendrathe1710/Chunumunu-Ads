import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticate, checkTeamPermissions } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Campaign routes
router.post('/teams/:teamId/campaigns', checkTeamPermissions, CampaignController.createCampaign);

router.get('/teams/:teamId/campaigns', checkTeamPermissions, CampaignController.getCampaigns);

// Team wallet balance endpoint
// Get team owner's wallet balance for campaign creation
router.get(
  '/teams/:teamId/wallet-balance',
  checkTeamPermissions,
  CampaignController.getTeamWalletBalance
);

router.get(
  '/teams/:teamId/campaigns/:campaignId',
  checkTeamPermissions,
  CampaignController.getCampaign
);

router.put(
  '/teams/:teamId/campaigns/:campaignId',
  checkTeamPermissions,
  CampaignController.updateCampaign
);

router.delete(
  '/teams/:teamId/campaigns/:campaignId',
  checkTeamPermissions,
  CampaignController.deleteCampaign
);

export default router;
