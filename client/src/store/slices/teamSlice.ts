import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TeamWithUserRole, Permission, TeamRole } from '@shared/types';

// The API currently returns TeamWithOwner (without userRole / userPermissions) for list & create.
// We'll store a unified internal shape (TeamWithUserRole) by augmenting when data arrives.
interface TeamState {
  currentTeam: TeamWithUserRole | null;
  userPermissions: Permission[];
  userRole: TeamRole | null;
  // Keep an optional error just for explicit clearing via clearTeamError
  error: string | null;
}

const initialState: TeamState = {
  currentTeam: null,
  userPermissions: [],
  userRole: null,
  error: null,
};

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
  extraReducers: () => {
    // No async thunks; React Query handles fetching/mutations
  },
});

export const { setCurrentTeam, clearTeamError, setUserPermissions } = teamSlice.actions;
export default teamSlice.reducer;
