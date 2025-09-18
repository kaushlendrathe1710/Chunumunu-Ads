import { z } from 'zod';

// Base schemas
const baseCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500, 'Description too long').optional().or(z.literal('')),
  budget: z
    .number({ invalid_type_error: 'Budget must be a number' })
    .min(0, 'Budget must be >= 0')
    .max(1_000_000, 'Budget too large'),
  startDate: z.date({ required_error: 'Start date required' }),
  endDate: z.date({ required_error: 'End date required' }),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
});

const baseAdSchema = z.object({
  title: z.string().min(1, 'Title required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  categories: z.array(z.string()).min(1, 'Select at least one category'),
  tags: z.array(z.string()).optional().default([]),
  ctaLink: z.string().url('Invalid URL').optional().or(z.literal('')),
  budget: z
    .number({ invalid_type_error: 'Budget must be a number' })
    .min(0, 'Budget must be >= 0')
    .max(1_000_000, 'Budget too large')
    .optional()
    .default(0),
  campaignId: z.string().min(1, 'Campaign required'),
  videoUrl: z.string().url('Video URL required'),
  thumbnailUrl: z.string().url('Thumbnail URL required'),
});

// Export specific schemas using Zod's built-in methods
export const campaignSchema = baseCampaignSchema;
export const adSchema = baseAdSchema;

export type CampaignFormValues = z.infer<typeof campaignSchema>;
export type AdFormValues = z.infer<typeof adSchema>;
