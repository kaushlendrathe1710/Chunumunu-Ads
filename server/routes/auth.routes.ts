import type { Express, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller';

export function registerAuthRoutes(app: Express): void {
  // Send OTP to email
  app.post('/api/auth/send-otp', AuthController.sendOtp);

  // Verify OTP and authenticate user
  app.post('/api/auth/verify-otp', AuthController.verifyOtp);

  // Google OAuth authentication
  app.post('/api/auth/google', AuthController.googleAuth);

  // Test endpoint for Google OAuth
  app.get('/api/auth/google/test', (req: Request, res: Response) => {
    res.json({
      message: 'Google OAuth endpoint is working',
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured',
      viteClientId: process.env.VITE_GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured',
      allEnvVars: Object.keys(process.env).filter((key) => key.includes('GOOGLE')),
    });
  });

  // Get current authenticated user info
  app.get('/api/auth/me', AuthController.getCurrentUser);

  // Logout route
  app.post('/api/auth/logout', AuthController.logout);
}
