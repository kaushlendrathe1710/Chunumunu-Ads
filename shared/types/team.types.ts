import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  teams,
  teamMembers,
  campaigns,
  ads,
  teamRoleEnum,
  permissionEnum,
} from '@server/db/schema';

// Insert schemas
export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
  avatar: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  role: true,
  permissions: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  description: true,
  status: true,
  budget: true,
  startDate: true,
  endDate: true,
  teamId: true,
});

export const insertAdSchema = createInsertSchema(ads).pick({
  title: true,
  description: true,
  categories: true,
  tags: true,
  ctaLink: true,
  videoUrl: true,
  thumbnailUrl: true,
  budget: true,
  status: true,
  campaignId: true,
});

// TypeScript types
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type TeamWithOwner = Team & {
  owner: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };
};

export type TeamWithUserRole = TeamWithOwner & {
  userRole: TeamRole;
  userPermissions: Permission[];
};

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamMemberWithUser = TeamMember & {
  user: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };
};

export type TeamRole = (typeof teamRoleEnum.enumValues)[number];
export type Permission = (typeof permissionEnum.enumValues)[number];

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof ads.$inferSelect;

// Update team validation schema
export const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

// Invite member validation schema
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'member', 'viewer']),
  permissions: z
    .array(
      z.enum([
        'create_campaign',
        'edit_campaign',
        'delete_campaign',
        'view_campaign',
        'create_ad',
        'edit_ad',
        'delete_ad',
        'view_ad',
        'manage_team',
      ])
    )
    .default([]),
});

// Update member validation schema
export const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
  permissions: z
    .array(
      z.enum([
        'create_campaign',
        'edit_campaign',
        'delete_campaign',
        'view_campaign',
        'create_ad',
        'edit_ad',
        'delete_ad',
        'view_ad',
        'manage_team',
      ])
    )
    .default([]),
});

// Permission check types
export type PermissionCheckRequest = {
  userId: number;
  teamId: number;
  permission: Permission;
};

export type PermissionCheckResponse = {
  hasPermission: boolean;
  userRole?: TeamRole;
  userPermissions?: Permission[];
};
