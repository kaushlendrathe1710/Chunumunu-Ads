import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userService } from '../db/services';

// For JWT authentication
const JWT_SECRET = process.env.JWT_SECRET!;

// Helper function to extract JWT token from request
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Auth middleware that checks either session or JWT token
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  // First check if user is authenticated via session
  if (req.session?.userId) {
    const user = await userService.getUserById(req.session?.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'User not found' });
    }
    (req as any).user = user;
    return next();
  }

  // If not, check for JWT token
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin authentication middleware
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated (this now attaches user to req)
  authenticate(req, res, async () => {
    // Get the user from req.user (set by authenticate middleware)
    const user = (req as any).user;

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  });
};

export const tryAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try session
    if (req.session?.userId) {
      const user = await userService.getUserById(req.session?.userId);
      if (user) {
        (req as any).user = user;
        return next();
      }
    }

    // Try JWT
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await userService.getUserById(decoded.userId);
      if (user) {
        (req as any).user = user;
      }
    }

    // Even if user is not found, allow to proceed
    next();
  } catch (err) {
    // Don't block user; just continue unauthenticated
    next();
  }
};
