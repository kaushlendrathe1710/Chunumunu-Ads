export const userRole = {
  user: 'user',
  admin: 'admin',
} as const;

export const teamRole = {
  owner: 'owner',
  admin: 'admin',
  member: 'member',
  viewer: 'viewer',
} as const;

export const permission = {
  create_campaign: 'create_campaign',
  edit_campaign: 'edit_campaign',
  delete_campaign: 'delete_campaign',
  view_campaign: 'view_campaign',
  create_ad: 'create_ad',
  edit_ad: 'edit_ad',
  delete_ad: 'delete_ad',
  view_ad: 'view_ad',
  manage_team: 'manage_team',
  view_analytics: 'view_analytics',
} as const;

export const adStatus = {
  draft: 'draft',
  active: 'active',
  paused: 'paused',
  completed: 'completed',
  rejected: 'rejected',
  under_review: 'under_review',
} as const;

export const adBudget = {
  unlimited: -1, // Ad will run until campaign budget is exhausted
  minimumBudget: 10, // Minimum $10 for paid ads
} as const;

export const campaignStatus = {
  draft: 'draft',
  active: 'active',
  paused: 'paused',
  completed: 'completed',
} as const;

export const theme = {
  dark: 'dark',
  light: 'light',
  system: 'system',
} as const;

export const limits = {
  maxTeamsPerUser: 2,
  maxMembersPerTeam: 5,
} as const;
