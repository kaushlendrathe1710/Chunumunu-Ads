import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchUserTeams, setCurrentTeam, setUserPermissions } from '@/store/slices/teamSlice';
import { TeamWithUserRole, Permission, TeamRole } from '@shared/types';

export const useTeam = () => {
  const dispatch = useAppDispatch();
  const { teams, currentTeam, userPermissions, userRole, loading, error } = useAppSelector(
    (state) => state.team
  );
  const { user } = useAppSelector((state) => state.auth);

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

  return {
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
};
