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
} as const;
