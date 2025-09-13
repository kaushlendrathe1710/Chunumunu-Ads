import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCurrentTeam, setUserPermissions } from '@/store/slices/teamSlice';
import { TeamWithUserRole, Permission } from '@shared/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TeamAPI from '@/api/teamApi';
import { QK } from '@/api/queryKeys';

export const useTeam = () => {
  const dispatch = useAppDispatch();
  const { currentTeam, userPermissions, userRole } = useAppSelector((state) => state.team);
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  const teamsQuery = useQuery({
    queryKey: QK.teams(),
    queryFn: () => TeamAPI.getUserTeams(),
    enabled: !!user,
  });

  const teamStatsQuery = useQuery({
    queryKey: QK.teamStats(),
    queryFn: () => TeamAPI.getUserTeamStats(),
    enabled: !!user,
  });

  // Augment teams to include default role/permissions for UI compatibility
  const teams: TeamWithUserRole[] = useMemo(() => {
    const raw = teamsQuery.data ?? [];
    return raw.map((t: any) => ({
      ...t,
      userRole: t.userRole || 'viewer',
      userPermissions: t.userPermissions || [],
    }));
  }, [teamsQuery.data]);

  useEffect(() => {
    if (!currentTeam && teams.length > 0) {
      const firstTeam = teams[0];
      dispatch(setCurrentTeam(firstTeam));
      dispatch(
        setUserPermissions({
          permissions: firstTeam.userPermissions,
          role: firstTeam.userRole,
        })
      );
    }
  }, [teams, currentTeam, dispatch]);

  // If the currently selected team was deleted or is no longer present, pick the next available team or clear selection
  useEffect(() => {
    if (!currentTeam) return;
    const stillExists = teams.some((t) => t.id === currentTeam.id);
    if (!stillExists) {
      const nextTeam = teams[0] ?? null;
      dispatch(setCurrentTeam(nextTeam));
      if (nextTeam) {
        dispatch(
          setUserPermissions({
            permissions: nextTeam.userPermissions,
            role: nextTeam.userRole,
          })
        );
      } else {
        dispatch(
          setUserPermissions({
            permissions: [],
            role: null,
          })
        );
      }
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
    if (userRole === 'owner') return true; // owners implicitly have all permissions
    return userPermissions.includes(permission);
  };

  const refreshTeams = () => {
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: QK.teams() });
    queryClient.invalidateQueries({ queryKey: QK.teamStats() });
  };

  return {
    teams,
    currentTeam,
    userPermissions,
    userRole,
    teamStats: teamStatsQuery.data ?? null,
    loading: teamsQuery.isLoading,
    statsLoading: teamStatsQuery.isLoading,
    error: teamsQuery.error ? (teamsQuery.error as any).message || 'Failed to fetch teams' : null,
    statsError: teamStatsQuery.error
      ? (teamStatsQuery.error as any).message || 'Failed to fetch team stats'
      : null,
    switchTeam,
    hasPermission,
    refreshTeams,
  };
};
