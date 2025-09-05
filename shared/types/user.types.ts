import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users, otpCodes, userRoleEnum } from '@server/db/schema';

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  avatar: true,
  bio: true,
  role: true,
  isVerified: true,
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).pick({
  email: true,
  code: true,
  expiresAt: true,
});

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;

// Profile update validation schema
export const updateProfileSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
