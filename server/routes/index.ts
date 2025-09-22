import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { registerAuthRoutes } from './auth.routes.js';
import { registerUserRoutes } from './user.routes.js';
import { registerTeamRoutes } from './team.routes.js';
import walletRoutes from './wallet.routes.js';
import uploadRoutes from './upload.routes.js';
import impressionRoutes from './impression.routes.js';
import campaignRoutes from './campaign.routes.js';
import adsRoutes from './ads.routes.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route groups
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerTeamRoutes(app);

  // Register wallet routes
  app.use('/api/wallet', walletRoutes);

  // Register upload routes
  app.use('/api/upload', uploadRoutes);

  // IMPORTANT: Register ad serving and impression routes (public endpoints) FIRST
  // before the authenticated routes to prevent auth middleware from applying globally
  app.use('/api/service', impressionRoutes);

  // Register campaign and ads routes (these have global auth middleware)
  app.use('/api', campaignRoutes);
  app.use('/api', adsRoutes);

  // Create and return HTTP server
  return createServer(app);
}
