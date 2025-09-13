export * from '@shared/types/index';
import { Request } from 'express';
import { Permission, TeamRole } from '@shared/types';

// Server-specific types can be added here
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    avatar?: string;
    isAdmin?: boolean;
    isVerified?: boolean;
  };
  userPermissions?: Permission[];
  userRole?: TeamRole;
}

// Session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
