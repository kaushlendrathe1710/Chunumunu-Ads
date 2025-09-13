import 'dotenv/config';
import { createApp } from './app';
import { registerRoutes } from './routes/index';
import { setupVite, serveStatic, log } from './vite';
import { initDatabase } from '@server/db/connect';
// sessionStore is exported from services when needed

const app = createApp();

(async () => {
  try {
    // Log the current environment
    console.log(`Starting server in ${process.env.NODE_ENV || 'production'} mode`);

    // Initialize database
    await initDatabase();

    const server = await registerRoutes(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = process.env.PORT;
    server.listen(port, () => {
      log(`Server running at: port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
