import { z } from 'zod';

// Validation schemas for API endpoints
export const verifyEmailSchema = z.object({
  email: z.string().email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});
