import type { Express, Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, tryAuthenticate } from '../middleware/auth.middleware';
import { profileImageUpload } from '../config/multer';

export function registerUserRoutes(app: Express): void {
  // Enhanced Profile Routes
  app.put(
    '/api/users/profile',
    authenticate,
    profileImageUpload.fields([
      { name: 'avatar', maxCount: 1 },
      { name: 'channelBanner', maxCount: 1 },
    ]),
    UserController.updateUserProfile
  );
  app.get('/api/users/:id/profile', UserController.getUserProfile);
}
