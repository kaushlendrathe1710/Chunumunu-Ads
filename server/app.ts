import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { tryAuthenticate } from './middleware/auth.middleware';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { userService } from './db/services';
import { log } from './vite';

export function createApp() {
  const app = express();
  // Ensure correct client IPs behind proxies (needed for geo-IP)
  app.set('trust proxy', true);

  // Setup CORS to allow cross-domain cookies in production
  const allowedOrigins = [
    process.env.VITE_CLIENT_URL!,
    process.env.VITE_AUTH_SERVER!,
    process.env.VITE_VIDEOSTREAMPRO_URL!
  ];

  app.use(
    cors({
      origin(origin, callback) {
        // allow requests with no origin (e.g. curl, mobile SDKs, same-origin navigations)
        if (!origin) return callback(null, true);

        // exact-match check (include protocol + port)
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // deny but do not throw synchronously
        // callback with false will result in no CORS headers set
        return callback(null, false);
      },
      credentials: true, // Allow cookies to be sent with requests
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Priority',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
    })
  );

  app.options(
    '*',
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Priority',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
    })
  );

  // Increase payload size limits to handle larger file uploads
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: false, limit: '500mb' }));

  // No global cookie-parser needed; we only set anon_id via res.cookie

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (path.startsWith('/api')) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + '…';
        }

        log(logLine);
      }
    });

    next();
  });

  // Set up static uploads directory
  if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
    fs.mkdirSync(path.join(process.cwd(), 'uploads'));
  }

  // Configure session using the storage interface's sessionStore property
  app.use(
    session({
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for longer persistence
        secure: process.env.NODE_ENV === 'production',
        // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        sameSite: 'none',
        path: '/',
        httpOnly: true, // Adds security by preventing client-side access to the cookie
      },
      store: userService.sessionStore,
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || 'youtube-clone-secret',
      name: 'chunumunu_sid', // Custom session name for better security
    })
  );

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({ message });
    throw err;
  });

  return app;
}
