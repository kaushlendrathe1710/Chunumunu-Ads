import type { Express } from 'express';
import { AuthController } from '../controllers/auth.controller';

export function registerAuthRoutes(app: Express): void {
  // VideoStreamPro SSO - Verify token from client
  app.post('/api/auth/sso/verify-token', AuthController.verifyToken);

  // Get current authenticated user info
  app.get('/api/auth/me', AuthController.getCurrentUser);

  // Debug endpoint to check authentication
  app.get('/api/auth/debug', (req, res) => {
    res.json({
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization?.substring(0, 20) + '...',
      hasSession: !!req.session?.userId,
      sessionUserId: req.session?.userId,
    });
  });

  // Logout route
  app.post('/api/auth/logout', AuthController.logout);
}
