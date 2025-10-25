import 'dotenv/config';
import { createApp } from './app';
import { registerRoutes } from './routes/index';
import { setupVite, serveStatic, log } from './vite';
import { initDatabase } from '@server/db/connect';
// sessionStore is exported from services when needed

// Validate required environment variables
const requiredEnvVars = [
  'VIDEOSTREAMPRO_AUTH_URL',
  'VIDEOSTREAMPRO_API_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Required environment variable ${envVar} is not defined`);
    console.error('Please check your .env file');
    process.exit(1);
  }
}

console.log('\n========== Chunumunu-Ads Configuration ==========');
console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`Port: ${process.env.PORT || 3000}`);
console.log(`VideoStreamPro Auth URL: ${process.env.VIDEOSTREAMPRO_AUTH_URL}`);
console.log(`VideoStreamPro API Key: ${process.env.VIDEOSTREAMPRO_API_KEY ? '✓ Configured' : '✗ Missing'}`);
console.log('=================================================\n');

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
