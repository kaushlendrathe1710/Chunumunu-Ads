import { Router } from 'express';
import { ImpressionController } from '../controllers/impression.controller';
import { AdsController } from '../controllers/ads.controller';

const router = Router();

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Service routes are working', path: req.path });
});

// Ad serving endpoints (public - no authentication required)
router.post('/ad/serve', AdsController.serveAd);

// Impression endpoints (public - no authentication required for ad serving integration)
router.post('/impression/confirm', ImpressionController.confirmImpression);
router.get('/impression/:token', ImpressionController.getImpression);

export default router;
