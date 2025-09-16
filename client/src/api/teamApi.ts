import {
  TeamWithOwner,
  TeamMemberWithUser,
  InsertTeam,
  Permission,
  TeamRole,
  PermissionCheckResponse,
} from '@shared/types';
import { apiClient } from './apiClient';

class TeamAPI {
  // Teams
  static async getUserTeams(): Promise<TeamWithOwner[]> {
    const { data } = await apiClient.get<{ teams: TeamWithOwner[] }>('/teams/user-teams');
    return data.teams;
  }

  static async getUserTeamStats(): Promise<{
    totalTeams: number;
    ownedTeams: number;
    maxTeamsAllowed: number;
    canCreateMore: boolean;
  }> {
    const { data } = await apiClient.get<{ stats: any }>('/teams/stats');
    return data.stats;
  }

  static async createTeam(teamData: InsertTeam | FormData): Promise<TeamWithOwner> {
    const { data } = await apiClient.post<{ team: TeamWithOwner }>('/teams', teamData, {
      headers: teamData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return data.team;
  }

  static async getTeamById(teamId: number): Promise<TeamWithOwner> {
    const { data } = await apiClient.get<{ team: TeamWithOwner }>(`/teams/${teamId}`);
    return data.team;
  }

  static async updateTeam(
    teamId: number,
    updates: Partial<InsertTeam> | FormData
  ): Promise<TeamWithOwner> {
    const { data } = await apiClient.put<{ team: TeamWithOwner }>(`/teams/${teamId}`, updates, {
      headers: updates instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return data.team;
  }

  static async deleteTeam(teamId: number): Promise<void> {
    await apiClient.delete(`/teams/${teamId}`);
  }

  // Team Members
  static async getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]> {
    const { data } = await apiClient.get<{ members: TeamMemberWithUser[] }>(
      `/teams/${teamId}/members`
    );
    return data.members;
  }

  static async inviteMember(
    teamId: number,
    memberData: { email: string; role: TeamRole; permissions: Permission[] }
  ): Promise<TeamMemberWithUser> {
    try {
      const { data } = await apiClient.post<{ member: TeamMemberWithUser }>(
        `/teams/${teamId}/members`,
        memberData
      );
      return data.member;
    } catch (e: any) {
      throw new Error(e.message || 'Failed to invite member');
    }
  }

  static async updateMember(
    teamId: number,
    userId: number,
    updates: { role: TeamRole; permissions: Permission[] }
  ): Promise<TeamMemberWithUser> {
    const { data } = await apiClient.put<{ member: TeamMemberWithUser }>(
      `/teams/${teamId}/members/${userId}`,
      updates
    );
    return data.member;
  }

  static async removeMember(teamId: number, userId: number): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/members/${userId}`);
  }

  static async leaveTeam(teamId: number): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/leave`);
  }

  // Permissions
  static async checkPermission(
    teamId: number,
    userId: number,
    permission: Permission
  ): Promise<PermissionCheckResponse> {
    const { data } = await apiClient.get<PermissionCheckResponse>(
      `/teams/${teamId}/permissions/${userId}?permission=${permission}`
    );
    return data;
  }

  static async getUserPermissions(
    teamId: number,
    userId: number
  ): Promise<{
    permissions: Permission[];
    role: TeamRole | null;
  }> {
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

    const checks = await Promise.all(
      allPermissions.map(async (permission) => {
        try {
          const result = await this.checkPermission(teamId, userId, permission);
          return { permission, ...result };
        } catch {
          return { permission, hasPermission: false, userRole: null };
        }
      })
    );

    const permissions = checks
      .filter((check) => check.hasPermission)
      .map((check) => check.permission);

    const role = checks.find((check) => check.userRole)?.userRole || null;

    return { permissions, role };
  }
}

export default TeamAPI;
