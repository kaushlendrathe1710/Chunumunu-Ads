import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { registerAuthRoutes } from './auth.routes.js';
import { registerUserRoutes } from './user.routes.js';
import { registerTeamRoutes } from './team.routes.js';
import walletRoutes from './wallet.routes.js';
import uploadRoutes from './upload.routes.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route groups
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerTeamRoutes(app);

  // Register wallet routes
  app.use('/api/wallet', walletRoutes);

  // Register upload routes
  app.use('/api/upload', uploadRoutes);

  // Create and return HTTP server
  return createServer(app);
}
