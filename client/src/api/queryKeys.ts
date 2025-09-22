// Centralized React Query keys to avoid typos
// Use helper functions for composite keys where parameters are involved

export const QK = {
  auth: () => ['auth', 'me'] as const,
  user: () => ['user', 'me'] as const,
  teams: () => ['teams'] as const,
  teamStats: () => ['team', 'stats'] as const,
  teamPermissions: (teamId: number | string, userId: number | string) =>
    ['team', teamId, 'permissions', userId] as const,
  teamMembers: (teamId: number | string) => ['team', teamId, 'members'] as const,
  campaigns: (teamId: number | string) => ['campaigns', teamId] as const,
  campaign: (teamId: number | string, campaignId: number | string) =>
    ['campaign', teamId, campaignId] as const,
  teamWalletBalance: (teamId: number | string) => ['team', teamId, 'wallet-balance'] as const,

  // Ad-related query keys
  ads: (teamId: number | string, filter?: string | number) =>
    filter ? (['ads', teamId, filter] as const) : (['ads', teamId] as const),
  campaignAds: (teamId: number | string, campaignId: number | string) =>
    ['ads', teamId, 'campaign', campaignId] as const,
  ad: (teamId: number | string, campaignId: number | string, adId: number | string) =>
    ['ad', teamId, campaignId, adId] as const,
  adBudgetInfo: (teamId: number | string, campaignId: number | string, requestedBudget?: number) =>
    requestedBudget
      ? (['ad-budget', teamId, campaignId, requestedBudget] as const)
      : (['ad-budget', teamId, campaignId] as const),

  wallet: () => ['wallet'] as const,
  walletTx: (page: number, limit: number) => ['wallet', 'transactions', page, limit] as const,
  walletTransactions: (page: number, limit: number) =>
    ['wallet', 'transactions', page, limit] as const,
  analytics: (teamId: number | string) => ['team', teamId, 'analytics'] as const,
};

export type QueryKey = ReturnType<(typeof QK)[keyof typeof QK]>;
