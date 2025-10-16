import { z } from 'zod';

// Base schemas
const baseCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500, 'Description too long').optional().or(z.literal('')),
  budget: z
    .number({ invalid_type_error: 'Budget must be a number' })
    .min(0, 'Budget must be >= 0')
    .max(1_000_000, 'Budget too large'),
  startDate: z.date({ required_error: 'Start date required' })
    .refine((date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Start date cannot be in the past'),
  endDate: z.date({ required_error: 'End date required' }),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
})
.refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
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

// Form schema that allows optional dates initially
export const campaignFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500, 'Description too long').optional().or(z.literal('')),
  budget: z
    .number({ invalid_type_error: 'Budget must be a number' })
    .min(0, 'Budget must be >= 0')
    .max(1_000_000, 'Budget too large'),
  startDate: z.date({ required_error: 'Start date required' }).optional()
    .refine((date) => {
      if (!date) return false; // Required field
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Start date cannot be in the past'),
  endDate: z.date({ required_error: 'End date required' }).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
})
.refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  if (!data.startDate) return false; // Start date required
  if (!data.endDate) return false; // End date required
  return true;
}, {
  message: 'Both dates are required and end date must be after start date',
  path: ['endDate'],
});

// Edit form schema that allows optional dates (for existing campaigns)
export const editCampaignFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500, 'Description too long').optional().or(z.literal('')),
  budget: z
    .number({ invalid_type_error: 'Budget must be a number' })
    .min(0, 'Budget must be >= 0')
    .max(1_000_000, 'Budget too large'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
})
.refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true; // Allow campaigns without dates (existing ones might not have dates set)
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Export specific schemas using Zod's built-in methods
export const campaignSchema = baseCampaignSchema;
export const adSchema = baseAdSchema;

export type CampaignFormValues = z.infer<typeof campaignSchema>;
export type CampaignFormData = z.infer<typeof campaignFormSchema>;
export type EditCampaignFormData = z.infer<typeof editCampaignFormSchema>;
export type AdFormValues = z.infer<typeof adSchema>;
