import type { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { userService } from '../db/services';
import { VideoStreamProService } from '../services/videostreampro.service';

// For JWT authentication
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// User cache to improve performance
const userCache = new Map<number, { user: any; timestamp: number }>();
const USER_CACHE_TTL = 60000; // 1 minute cache

// Validation schema for token verification
const verifyTokenSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
});

export class AuthController {
  // Verify VideoStreamPro token and authenticate user
  static async verifyToken(req: Request, res: Response) {
    try {
      const { verificationToken } = verifyTokenSchema.parse(req.body);

      // Verify token with VideoStreamPro and get user data
      const videostreamproUser = await VideoStreamProService.verifyUserToken(verificationToken);

      // Create or update local user
      const localUser = await userService.upsertVideostreamproUser(videostreamproUser);

      // Store user ID in session
      req.session.userId = localUser.id;

      // Generate JWT token
      const jwtToken = jwt.sign(
        { userId: localUser.id }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRY } as SignOptions
      );

      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        user: {
          id: localUser.id,
          email: localUser.email,
          username: localUser.username,
          avatar: localUser.avatar,
          bio: localUser.bio,
          role: localUser.role,
          isVerified: localUser.isVerified,
        },
        token: jwtToken,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid token format' 
        });
      }
      console.error('SSO token verification error:', error.message);
      return res.status(400).json({ 
        success: false, 
        message: error.message || 'Token verification failed' 
      });
    }
  }

  // Get current authenticated user
  static async getCurrentUser(req: Request, res: Response) {
    try {
      let userId: number;

      // Check session first
      if (req.session.userId) {
        userId = req.session.userId;
      } else {
        // Check JWT token
        const token = extractToken(req);
        if (!token) {
          return res.status(401).json({ message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        userId = decoded.userId;
      }

      // Check user cache first
      const cached = userCache.get(userId);
      if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
        return res.status(200).json({ user: cached.user });
      }

      // Get user from database
      const user = await userService.getUserById(userId);

      if (!user) {
        // Clean up invalid session/token
        if (req.session.userId) {
          req.session.destroy(() => {});
        }
        return res.status(401).json({ message: 'User not found' });
      }

      // Cache the user
      userCache.set(userId, {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          isVerified: user.isVerified,
        },
        timestamp: Date.now(),
      });

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({ message: 'Failed to get user' });
    }
  }

  // Logout user
  static async logout(req: Request, res: Response) {
    try {
      // Clear session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ message: 'Logout failed' });
        }

        // Clear user cache
        if (req.session?.userId) {
          userCache.delete(req.session.userId);
        }

        res.status(200).json({ message: 'Logged out successfully' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ message: 'Logout failed' });
    }
  }
}

// Function to extract JWT token from auth header
export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};
