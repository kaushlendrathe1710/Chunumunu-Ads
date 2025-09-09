import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserTeams, setCurrentTeam, setUserPermissions } from '@/store/slices/teamSlice';
import { TeamWithUserRole, Permission, TeamRole } from '@shared/types';

interface TeamContextType {
  teams: TeamWithUserRole[];
  currentTeam: TeamWithUserRole | null;
  userPermissions: Permission[];
  userRole: TeamRole | null;
  loading: boolean;
  error: string | null;
  switchTeam: (team: TeamWithUserRole) => void;
  hasPermission: (permission: Permission) => boolean;
  refreshTeams: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const dispatch = useAppDispatch();
  const { teams, currentTeam, userPermissions, userRole, loading, error } = useAppSelector(
    (state) => state.team
  );
  const { user } = useAuth(); // Get user from AuthContext instead of Redux

  useEffect(() => {
    if (user) {
      dispatch(fetchUserTeams());
    }
  }, [dispatch, user]);

  useEffect(() => {
    // Set first team as current if none selected
    if (teams.length > 0 && !currentTeam) {
      const firstTeam = teams[0];
      dispatch(setCurrentTeam(firstTeam));
      // Set permissions from the team data directly
      dispatch(
        setUserPermissions({
          permissions: firstTeam.userPermissions,
          role: firstTeam.userRole,
        })
      );
    }
  }, [teams, currentTeam, dispatch]);

  const switchTeam = (team: TeamWithUserRole) => {
    dispatch(setCurrentTeam(team));
    // Set permissions from the team data directly
    dispatch(
      setUserPermissions({
        permissions: team.userPermissions,
        role: team.userRole,
      })
    );
  };

  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  const refreshTeams = () => {
    if (user) {
      dispatch(fetchUserTeams());
    }
  };

  const value: TeamContextType = {
    teams,
    currentTeam,
    userPermissions,
    userRole,
    loading,
    error,
    switchTeam,
    hasPermission,
    refreshTeams,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
