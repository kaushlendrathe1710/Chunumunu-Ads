import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { registerAuthRoutes } from './auth.routes.js';
import { registerUserRoutes } from './user.routes.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route groups
  registerAuthRoutes(app);
  registerUserRoutes(app);

  // Create and return HTTP server
  return createServer(app);
}
