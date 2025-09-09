import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Team,
  TeamWithOwner,
  TeamWithUserRole,
  TeamMemberWithUser,
  Permission,
  TeamRole,
  PermissionCheckResponse,
} from '@shared/types';

interface TeamState {
  teams: TeamWithUserRole[];
  currentTeam: TeamWithUserRole | null;
  teamMembers: TeamMemberWithUser[];
  userPermissions: Permission[];
  userRole: TeamRole | null;
  loading: boolean;
  membersLoading: boolean;
  error: string | null;
  membersError: string | null;
}

const initialState: TeamState = {
  teams: [],
  currentTeam: null,
  teamMembers: [],
  userPermissions: [],
  userRole: null,
  loading: false,
  membersLoading: false,
  error: null,
  membersError: null,
};

// Async thunks
export const fetchUserTeams = createAsyncThunk('team/fetchUserTeams', async () => {
  const response = await fetch('/api/teams/user-teams', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch teams');
  }

  const data = await response.json();
  return data.teams; // Extract the teams array from the response
});

export const createTeam = createAsyncThunk(
  'team/createTeam',
  async (teamData: { name: string; description?: string; avatar?: string }) => {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(teamData),
    });

    if (!response.ok) {
      throw new Error('Failed to create team');
    }

    const data = await response.json();
    return data.team;
  }
);

export const fetchTeamMembers = createAsyncThunk(
  'team/fetchTeamMembers',
  async (teamId: number) => {
    const response = await fetch(`/api/teams/${teamId}/members`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch team members');
    }

    const data = await response.json();
    return data.members;
  }
);

export const inviteTeamMember = createAsyncThunk(
  'team/inviteTeamMember',
  async ({
    teamId,
    memberData,
  }: {
    teamId: number;
    memberData: { email: string; role: TeamRole; permissions: Permission[] };
  }) => {
    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(memberData),
    });

    if (!response.ok) {
      throw new Error('Failed to invite member');
    }

    const data = await response.json();
    return data.member;
  }
);

export const updateTeamMember = createAsyncThunk(
  'team/updateTeamMember',
  async ({
    teamId,
    userId,
    updates,
  }: {
    teamId: number;
    userId: number;
    updates: { role: TeamRole; permissions: Permission[] };
  }) => {
    const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update member');
    }

    const data = await response.json();
    return data.member;
  }
);

export const removeTeamMember = createAsyncThunk(
  'team/removeTeamMember',
  async ({ teamId, userId }: { teamId: number; userId: number }) => {
    const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to remove member');
    }

    return userId;
  }
);

export const checkUserPermissions = createAsyncThunk(
  'team/checkUserPermissions',
  async ({ teamId, userId }: { teamId: number; userId: number }) => {
    // Use the more efficient single endpoint approach
    const response = await fetch(`/api/teams/${teamId}/permissions/${userId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to check permissions');
    }

    const data = await response.json();
    return {
      userPermissions: data.userPermissions || [],
      userRole: data.userRole || null,
    };
  }
);

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setCurrentTeam: (state, action: PayloadAction<TeamWithUserRole | null>) => {
      state.currentTeam = action.payload;
    },
    clearTeamError: (state) => {
      state.error = null;
    },
    setUserPermissions: (
      state,
      action: PayloadAction<{ permissions: Permission[]; role: TeamRole | null }>
    ) => {
      state.userPermissions = action.payload.permissions;
      state.userRole = action.payload.role;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user teams
      .addCase(fetchUserTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload;
        // If no current team and we have teams, set the first one
        if (!state.currentTeam && action.payload.length > 0) {
          const firstTeam = action.payload[0];
          state.currentTeam = firstTeam;
          state.userRole = firstTeam.userRole;
          state.userPermissions = firstTeam.userPermissions;
        }
      })
      .addCase(fetchUserTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch teams';
      })

      // Create team
      .addCase(createTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams.push(action.payload);
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create team';
      })

      // Fetch team members
      .addCase(fetchTeamMembers.pending, (state) => {
        state.membersLoading = true;
        state.membersError = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.membersLoading = false;
        state.teamMembers = action.payload;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.membersLoading = false;
        state.membersError = action.error.message || 'Failed to fetch team members';
      })

      // Invite team member
      .addCase(inviteTeamMember.fulfilled, (state, action) => {
        // We'll refetch members after invite, so no direct state update needed
      })
      .addCase(inviteTeamMember.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to invite member';
      })

      // Update team member
      .addCase(updateTeamMember.fulfilled, (state, action) => {
        const index = state.teamMembers.findIndex((member) => member.id === action.payload.id);
        if (index !== -1) {
          state.teamMembers[index] = { ...state.teamMembers[index], ...action.payload };
        }
      })
      .addCase(updateTeamMember.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update member';
      })

      // Remove team member
      .addCase(removeTeamMember.fulfilled, (state, action) => {
        state.teamMembers = state.teamMembers.filter((member) => member.userId !== action.payload);
      })
      .addCase(removeTeamMember.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to remove member';
      })

      // Check user permissions
      .addCase(checkUserPermissions.fulfilled, (state, action) => {
        state.userPermissions = action.payload.userPermissions;
        state.userRole = action.payload.userRole;
      });
  },
});

export const { setCurrentTeam, clearTeamError, setUserPermissions } = teamSlice.actions;
export default teamSlice.reducer;
