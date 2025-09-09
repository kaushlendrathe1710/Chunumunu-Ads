import { db } from '@server/db';
import { teams, teamMembers, campaigns, ads } from '@server/db/schema';
import {
  InsertTeam,
  InsertTeamMember,
  TeamWithOwner,
  TeamWithUserRole,
  TeamMemberWithUser,
  TeamRole,
  Permission,
} from '@shared/types';
import { eq, and } from 'drizzle-orm';

export class TeamService {
  static async createTeam(teamData: InsertTeam, ownerId: number) {
    // Check team limit first
    const userTeamsCount = await this.getUserTeamsCount(ownerId);
    if (userTeamsCount >= 5) {
      throw new Error('Maximum team limit reached. You can create up to 5 teams.');
    }

    const result = await db.transaction(async (tx) => {
      // Create the team
      const [team] = await tx
        .insert(teams)
        .values({
          ...teamData,
          ownerId,
        })
        .returning();

      // Add owner as team member with owner role but empty permissions (owner has all permissions by default)
      await tx.insert(teamMembers).values({
        teamId: team.id,
        userId: ownerId,
        role: 'owner',
        permissions: [], // Empty for owner - they have all permissions
      });

      return team;
    });

    return result;
  }

  static async getUserTeamsCount(userId: number): Promise<number> {
    const result = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
    });
    return result.length;
  }

  static async getTeamById(teamId: number): Promise<TeamWithOwner | null> {
    const result = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        owner: {
          columns: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return result || null;
  }

  static async getUserTeams(userId: number): Promise<TeamWithUserRole[]> {
    const result = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
      with: {
        team: {
          with: {
            owner: {
              columns: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return result.map((member) => ({
      ...member.team,
      userRole: member.role,
      userPermissions: member.permissions || []
    }));
  }

  static async addTeamMember(memberData: InsertTeamMember) {
    const [member] = await db.insert(teamMembers).values(memberData).returning();
    return member;
  }

  static async getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]> {
    const result = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return result;
  }

  static async updateTeamMember(
    teamId: number,
    userId: number,
    updates: {
      role?: TeamRole;
      permissions?: Permission[];
    }
  ) {
    const [member] = await db
      .update(teamMembers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();

    return member;
  }

  static async removeTeamMember(teamId: number, userId: number) {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  static async getUserTeamMembership(teamId: number, userId: number) {
    const result = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
    });

    return result || null;
  }

  static async checkUserPermission(
    teamId: number,
    userId: number,
    permission: Permission
  ): Promise<{
    hasPermission: boolean;
    userRole?: TeamRole;
    userPermissions?: Permission[];
  }> {
    const membership = await this.getUserTeamMembership(teamId, userId);

    if (!membership) {
      return { hasPermission: false };
    }

    const { role, permissions } = membership;

    // Owner has all permissions automatically (regardless of permissions array)
    if (role === 'owner') {
      const allPermissions: Permission[] = [
        'create_campaign',
        'edit_campaign',
        'delete_campaign',
        'view_campaign',
        'create_ad',
        'edit_ad',
        'delete_ad',
        'view_ad',
        'manage_team',
      ];
      return {
        hasPermission: true,
        userRole: role,
        userPermissions: allPermissions,
      };
    }

    // Admin has manage_team permission plus whatever is in permissions array
    if (role === 'admin') {
      const hasPermission =
        permission === 'manage_team' || Boolean(permissions && permissions.includes(permission));
      return {
        hasPermission,
        userRole: role,
        userPermissions: permissions || [],
      };
    }

    // Member and viewer only have permissions explicitly listed
    const hasPermission = permissions ? permissions.includes(permission) : false;
    return {
      hasPermission,
      userRole: role,
      userPermissions: permissions || [],
    };
  }

  static async getUserPermissionsInTeam(
    teamId: number,
    userId: number
  ): Promise<{
    isMember: boolean;
    userRole?: TeamRole;
    userPermissions?: Permission[];
  }> {
    const membership = await this.getUserTeamMembership(teamId, userId);

    if (!membership) {
      return { isMember: false };
    }

    const { role, permissions } = membership;

    // Owner has all permissions automatically (regardless of permissions array)
    if (role === 'owner') {
      const allPermissions: Permission[] = [
        'create_campaign',
        'edit_campaign',
        'delete_campaign',
        'view_campaign',
        'create_ad',
        'edit_ad',
        'delete_ad',
        'view_ad',
        'manage_team',
      ];
      return {
        isMember: true,
        userRole: role,
        userPermissions: allPermissions,
      };
    }

    // Admin has manage_team permission plus whatever is in permissions array
    if (role === 'admin') {
      const adminPermissions = ['manage_team', ...(permissions || [])];
      return {
        isMember: true,
        userRole: role,
        userPermissions: adminPermissions,
      };
    }

    // Member and viewer only have permissions explicitly listed
    return {
      isMember: true,
      userRole: role,
      userPermissions: permissions || [],
    };
  }

  static async updateTeam(teamId: number, updates: Partial<InsertTeam>) {
    const [team] = await db
      .update(teams)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId))
      .returning();

    return team;
  }

  static async deleteTeam(teamId: number) {
    await db.delete(teams).where(eq(teams.id, teamId));
  }
}
