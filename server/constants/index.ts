// Constants for ad serving and billing
export const COST_PER_VIEW_CENTS = 10; // 10 cents per view
export const IMPRESSION_TTL_MINUTES = 30; // 30 minutes for impression token to expire

// Scoring weights for ad selection
export const SCORING_WEIGHTS = {
  TAG_OVERLAP: 0.4, // 40% weight for tag similarity
  CATEGORY_MATCH: 0.3, // 30% weight for category match
  BUDGET_FACTOR: 0.2, // 20% weight for remaining budget
  BID_AMOUNT: 0.1, // 10% weight for bid amount (future feature)
} as const;

// Ad serving thresholds
export const AD_SERVING_LIMITS = {
  MAX_CANDIDATES: 100, // Maximum candidates to fetch from DB
  MIN_SCORE: 0.01, // Very low minimum score (1%) to ensure we serve ads when available
} as const;

// Budget check thresholds
export const BUDGET_THRESHOLDS = {
  LOW_BUDGET_PERCENT: 0.1, // 10% remaining budget considered low
  EMERGENCY_RESERVE_CENTS: 50, // 50 cents minimum reserve
} as const;
