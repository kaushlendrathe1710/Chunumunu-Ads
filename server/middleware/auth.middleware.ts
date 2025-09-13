import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userService } from '../db/services';
import { TeamService } from '../db/services';
import { Permission } from '@shared/types';
import { AuthenticatedRequest } from '../types';

// For JWT authentication
const JWT_SECRET = process.env.JWT_SECRET!;

// Helper function to extract JWT token from request
const extractToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Auth middleware that checks either session or JWT token
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // First check if user is authenticated via session
  if (req.session?.userId) {
    const user = await userService.getUserById(req.session?.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar || undefined,
      isAdmin: user.role === 'admin',
      isVerified: user.isVerified || false,
    };
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
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar || undefined,
      isAdmin: user.role === 'admin',
      isVerified: user.isVerified || false,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Permission middleware factory
export const requirePermission = (permission: Permission) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const teamId = parseInt(req.params.teamId!);

      if (!user || !teamId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const permissionCheck = await TeamService.checkUserPermission(teamId, user.id, permission);

      if (!permissionCheck.hasPermission) {
        return res.status(403).json({
          message: 'Insufficient permissions',
          required: permission,
        });
      }

      // Attach permission info to request for potential use in handlers
      req.userPermissions = permissionCheck.userPermissions;
      req.userRole = permissionCheck.userRole;

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

// Admin authentication middleware
export const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // First ensure the user is authenticated (this now attaches user to req)
  authenticate(req, res, async () => {
    // Get the user from req.user (set by authenticate middleware)
    const user = req.user;

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  });
};

export const tryAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try session
    if (req.session?.userId) {
      const user = await userService.getUserById(req.session?.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar || undefined,
          isAdmin: user.role === 'admin',
          isVerified: user.isVerified || false,
        };
        return next();
      }
    }

    // Try JWT
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await userService.getUserById(decoded.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar || undefined,
          isAdmin: user.role === 'admin',
          isVerified: user.isVerified || false,
        };
      }
    }

    // Even if user is not found, allow to proceed
    next();
  } catch (err) {
    // Don't block user; just continue unauthenticated
    next();
  }
};

// Middleware to check team permissions and attach user permissions to request
export const checkTeamPermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    const teamId = req.params.teamId;

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    const permissionCheck = await TeamService.getUserPermissionsInTeam(parseInt(teamId), user.id);

    if (!permissionCheck.isMember) {
      return res.status(403).json({
        message: 'You are not a member of this team',
      });
    }

    // Attach permission info to request for use in handlers
    req.userPermissions = permissionCheck.userPermissions;
    req.userRole = permissionCheck.userRole;

    next();
  } catch (error) {
    console.error('Team permission check error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
