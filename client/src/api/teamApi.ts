import {
  TeamWithOwner,
  TeamMemberWithUser,
  InsertTeam,
  Permission,
  TeamRole,
  PermissionCheckResponse,
} from '@shared/types';

const API_BASE = '/api';

class TeamAPI {
  // Teams
  static async getUserTeams(): Promise<TeamWithOwner[]> {
    const response = await fetch(`${API_BASE}/teams`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }

    const data = await response.json();
    return data.teams;
  }

  static async createTeam(teamData: InsertTeam): Promise<TeamWithOwner> {
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(teamData),
    });

    if (!response.ok) {
      throw new Error('Failed to create team');
    }

    const data = await response.json();
    return data.team;
  }

  static async getTeamById(teamId: number): Promise<TeamWithOwner> {
    const response = await fetch(`${API_BASE}/teams/${teamId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch team');
    }

    const data = await response.json();
    return data.team;
  }

  static async updateTeam(teamId: number, updates: Partial<InsertTeam>): Promise<TeamWithOwner> {
    const response = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update team');
    }

    const data = await response.json();
    return data.team;
  }

  // Team Members
  static async getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]> {
    const response = await fetch(`${API_BASE}/teams/${teamId}/members`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch team members');
    }

    const data = await response.json();
    return data.members;
  }

  static async inviteMember(
    teamId: number,
    memberData: { email: string; role: TeamRole; permissions: Permission[] }
  ): Promise<TeamMemberWithUser> {
    const response = await fetch(`${API_BASE}/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(memberData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to invite member');
    }

    const data = await response.json();
    return data.member;
  }

  static async updateMember(
    teamId: number,
    userId: number,
    updates: { role: TeamRole; permissions: Permission[] }
  ): Promise<TeamMemberWithUser> {
    const response = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update member');
    }

    const data = await response.json();
    return data.member;
  }

  static async removeMember(teamId: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to remove member');
    }
  }

  // Permissions
  static async checkPermission(
    teamId: number,
    userId: number,
    permission: Permission
  ): Promise<PermissionCheckResponse> {
    const response = await fetch(
      `${API_BASE}/teams/${teamId}/permissions/${userId}?permission=${permission}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check permission');
    }

    return response.json();
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
