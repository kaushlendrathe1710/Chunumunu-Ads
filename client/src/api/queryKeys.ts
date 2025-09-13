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
  ads: (teamId: number | string, filter?: string | number) =>
    filter ? (['ads', teamId, filter] as const) : (['ads', teamId] as const),
  ad: (teamId: number | string, campaignId: number | string, adId: number | string) =>
    ['ad', teamId, campaignId, adId] as const,
  wallet: () => ['wallet'] as const,
  walletTx: (page: number, limit: number) => ['wallet', 'transactions', page, limit] as const,
  walletTransactions: (page: number, limit: number) =>
    ['wallet', 'transactions', page, limit] as const,
  analytics: (teamId: number | string) => ['team', teamId, 'analytics'] as const,
};

export type QueryKey = ReturnType<(typeof QK)[keyof typeof QK]>;
