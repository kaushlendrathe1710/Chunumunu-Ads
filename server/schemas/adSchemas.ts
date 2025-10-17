import { z } from 'zod';

// Request schema for POST /ads/serve
export const serveAdRequestSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
  category: z.string().optional(), // Made optional
  tags: z.array(z.string()).optional(), // Made optional
  user_id: z.string().optional(), // Authenticated user ID
  anon_id: z.string().optional(), // Anonymous user ID
  sessionId: z.string().optional(),
}).refine(
  (data) => data.user_id || data.anon_id,
  {
    message: "Either user_id (for authenticated users) or anon_id (for anonymous users) must be provided",
    path: ["user_id", "anon_id"],
  }
).refine(
  (data) => data.category || (data.tags && data.tags.length > 0),
  {
    message: "Either category or at least one tag must be provided",
    path: ["category", "tags"],
  }
);

export type ServeAdRequest = z.infer<typeof serveAdRequestSchema>;

// Response schema for successful ad serving
export const adMetadataSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  videoUrl: z.string(),
  thumbnailUrl: z.string(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  ctaLink: z.string().nullable(),
});

export const serveAdResponseSchema = z.object({
  ad: adMetadataSchema,
  impressionToken: z.string(),
  costCents: z.number(),
  expiresAt: z.string(), // ISO string
});

export type ServeAdResponse = z.infer<typeof serveAdResponseSchema>;

// Response schema for no ads available
export const noAdsResponseSchema = z.object({
  reason: z.literal('no_eligible_ads'),
});

export type NoAdsResponse = z.infer<typeof noAdsResponseSchema>;

// Request schema for POST /impressions/confirm
export const confirmImpressionRequestSchema = z.object({
  token: z.string().min(1, 'Impression token is required'),
  event: z.enum(['served', 'clicked', 'completed', 'skipped']),
  // Optional user identification (for additional tracking)
  user_id: z.string().optional(), // If user is authenticated
  anon_id: z.string().optional(), // If user is anonymous
  metadata: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
      viewDuration: z.number().optional(), // in seconds
      videoProgress: z.number().min(0).max(100).optional(), // percentage
    })
    .optional(),
});

export type ConfirmImpressionRequest = z.infer<typeof confirmImpressionRequestSchema>;

// Response schema for impression confirmation
export const confirmImpressionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  billingDetails: z
    .object({
      costCents: z.number(),
      remainingBudget: z.number(),
    })
    .optional(),
});

export type ConfirmImpressionResponse = z.infer<typeof confirmImpressionResponseSchema>;

// Internal schemas for scoring and selection
export const candidateAdSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  ctaLink: z.string().nullable(),
  videoUrl: z.string(),
  thumbnailUrl: z.string(),
  budget: z.string().nullable(), // Decimal as string
  spent: z.string(),
  campaignId: z.number(),
  campaignBudget: z.string().nullable(),
  campaignSpent: z.string(),
  score: z.number().optional(),
});

export type CandidateAd = z.infer<typeof candidateAdSchema>;

// Scoring result schema
export const scoringResultSchema = z.object({
  adId: z.number(),
  score: z.number(),
  factors: z.object({
    tagOverlap: z.number(),
    categoryMatch: z.number(),
    budgetFactor: z.number(),
    bidAmount: z.number(),
  }),
});

export type ScoringResult = z.infer<typeof scoringResultSchema>;
