import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { campaigns, ads } from '@server/db/schema';

// Campaign validation schemas
export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  description: true,
  status: true,
  budget: true,
  startDate: true,
  endDate: true,
  teamId: true,
});

export const updateCampaignSchema = insertCampaignSchema.partial();

// Ad validation schemas - custom schemas to handle number/string conversion
export const insertAdSchema = z.object({
  title: z.string().min(1, 'Ad title is required').max(100),
  description: z.string().optional(),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  tags: z.array(z.string()).optional().default([]),
  ctaLink: z.string().url().optional(),
  videoUrl: z.string().url('Valid video URL is required'),
  thumbnailUrl: z.string().url('Valid thumbnail URL is required'),
  budget: z
    .union([
      z.number().positive('Budget must be positive'),
      z
        .string()
        .transform((val) => parseFloat(val))
        .refine((val) => val > 0, 'Budget must be positive'),
    ])
    .optional()
    .transform((val) => val?.toString()),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
  campaignId: z.number().int().positive(),
});

export const updateAdSchema = z.object({
  title: z.string().min(1, 'Ad title is required').max(100).optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).min(1, 'At least one category is required').optional(),
  tags: z.array(z.string()).optional(),
  ctaLink: z.string().url().optional(),
  videoUrl: z.string().url('Valid video URL is required').optional(),
  thumbnailUrl: z.string().url('Valid thumbnail URL is required').optional(),
  budget: z
    .union([
      z.number().positive('Budget must be positive'),
      z
        .string()
        .transform((val) => parseFloat(val))
        .refine((val) => val > 0, 'Budget must be positive'),
    ])
    .optional()
    .transform((val) => val?.toString()),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
});

// Campaign types
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

export type CampaignWithDetails = Campaign & {
  creator?: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };
  team?: {
    id: number;
    name: string;
  };
};

// Ad types
export type InsertAd = z.infer<typeof insertAdSchema>;
export type UpdateAd = z.infer<typeof updateAdSchema>;
export type Ad = typeof ads.$inferSelect;

export type AdWithDetails = Ad & {
  creator?: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };
  campaign?: {
    id: number;
    name: string;
    teamId: number;
  };
};

// Budget and permission related types
export interface AdBudgetInfo {
  campaignBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
  requestedBudget?: number;
}

export interface AdPermissionContext {
  userId: number;
  teamId: number;
  campaignId: number;
  permissions: string[];
}

// API response types
export interface CreateAdResponse extends AdWithDetails {}

export interface DeleteAdResponse {
  message: string;
  refundAmount: number;
}

export interface CampaignBudgetValidation {
  isValid: boolean;
  campaignBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
  error?: string;
}
