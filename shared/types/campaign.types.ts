import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { campaigns, ads } from '@server/db/schema';

// Base campaign schema without date validations
// Note: the DB schema uses timestamps for start/end dates which map to Date in Zod.
// However incoming JSON from the client will typically contain ISO strings. To
// accept both representations we pick the fields from the generated schema and
// then override startDate/endDate to accept either a Date or an ISO string.
const baseCampaignSchema = createInsertSchema(campaigns)
  .pick({
    name: true,
    description: true,
    status: true,
    budget: true,
    // keep teamId as-is from generated schema
    teamId: true,
  })
  .extend({
    // Accept either Date objects (internal) or ISO date strings (from client JSON)
    startDate: z.union([z.string(), z.date()]).optional(),
    endDate: z.union([z.string(), z.date()]).optional(),
  });

// Campaign validation schemas with date validations
export const insertCampaignSchema = baseCampaignSchema
.refine((data) => {
  // Validate dates if provided
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if start date is not in the past
    if (startDate < today) {
      return false;
    }
    
    // Check if end date is after start date
    if (endDate <= startDate) {
      return false;
    }
  }
  return true;
}, {
  message: 'Invalid date range: start date cannot be in the past and end date must be after start date',
});

export const updateCampaignSchema = baseCampaignSchema.partial();

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
