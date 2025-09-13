import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { userService, otpService } from '../db/services';
import { sendOtpEmail } from '../emails/email';
import { verifyEmailSchema, verifyOtpSchema } from '@shared/types';
import fetch from 'node-fetch';
import { userRole } from '@shared/constants';

// For JWT authentication
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = process.env.JWT_EXPIRY!;

// Cache for recent OTP verifications to reduce DB lookups
const otpVerificationCache = new Map<
  string,
  {
    email: string;
    verified: boolean;
    timestamp: number;
  }
>();

// User cache to improve performance
const userCache = new Map<number, { user: any; timestamp: number }>();
const USER_CACHE_TTL = 60000; // 1 minute cache

export class AuthController {
  // Send OTP to email
  static async sendOtp(req: Request, res: Response) {
    try {
      const { email } = verifyEmailSchema.parse(req.body);

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

      await otpService.createOtp({ email, code, expiresAt });

      // Send OTP via email
      await sendOtpEmail(email, code);

      return res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid email address' });
      }
      return res.status(500).json({ message: 'Failed to send OTP' });
    }
  }

  // Verify OTP and authenticate user
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, code } = verifyOtpSchema.parse(req.body);

      // Get the OTP from database
      const otp = await otpService.getValidOtp(email, code);

      if (!otp) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Delete the used OTP
      await otpService.deleteOtp(otp.id);

      // Get or create user
      let user = await userService.getUserByEmail(email);

      if (!user) {
        // Create new user with default values
        user = await userService.createUser({
          email,
          username: email.split('@')[0], // Use email prefix as default username
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          role: userRole.user,
          isVerified: false,
        });
      }

      // Store verification in cache
      const cacheKey = `${email}:${code}`;
      otpVerificationCache.set(cacheKey, {
        email,
        verified: true,
        timestamp: Date.now(),
      });

      // Clean up expired cache entries
      setTimeout(() => {
        otpVerificationCache.delete(cacheKey);
      }, 60000); // Clean up after 1 minute

      // Store user ID in session
      req.session.userId = user.id;

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
      });

      return res.status(200).json({
        message: 'Authentication successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data' });
      }
      console.error('OTP verification error:', error);
      return res.status(500).json({ message: 'Authentication failed' });
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

  // Google OAuth authentication
  static async googleAuth(req: Request, res: Response) {
    try {
      console.log('Google auth request body:', req.body);
      console.log('Google auth request headers:', req.headers);

      const { access_token } = req.body;

      if (!access_token) {
        console.log('No access token found in request body');
        return res.status(400).json({ message: 'Access token is required' });
      }

      // Verify the access token with Google
      const googleResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
      );

      if (!googleResponse.ok) {
        return res.status(401).json({ message: 'Invalid access token' });
      }

      // @ts-ignore
      const googleUser: { email: string; name: string; picture: string } =
        await googleResponse.json();

      // Get or create user
      let user = await userService.getUserByEmail(googleUser.email);

      if (!user) {
        // Create new user with Google data
        user = await userService.createUser({
          email: googleUser.email,
          username: googleUser.name || googleUser.email.split('@')[0],
          avatar:
            googleUser.picture ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${googleUser.email}`,
          role: userRole.user,
          isVerified: true, // Google users are pre-verified
        });
      }

      // Store user ID in session
      req.session.userId = user?.id;

      // Generate JWT token
      const token = jwt.sign({ userId: user?.id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
      });

      return res.status(200).json({
        user: {
          id: user?.id,
          email: user?.email,
          username: user?.username,
          avatar: user?.avatar,
          role: userRole.user,
          isVerified: user?.isVerified,
        },
        token,
      });
    } catch (error) {
      console.error('Google auth error:', error);
      return res.status(500).json({ message: 'Google authentication failed' });
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
