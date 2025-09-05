// Validation utilities
import { z } from 'zod';

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  // At least 8 characters long
  return password.length >= 8;
}

export function validateUsername(username: string): boolean {
  // 3-50 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace dangerous characters
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Common validation schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const idSchema = z.object({
  id: z.coerce.number().min(1),
});
