import React, { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Plus, Users } from 'lucide-react';
import { CreateTeamModal } from '.';

export function TeamSelector() {
  const { teams, currentTeam, switchTeam, hasPermission, teamStats, loading } = useTeam();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={currentTeam?.avatar || ''} alt={currentTeam?.name || 'Team'} />
                <AvatarFallback className="text-xs">
                  {currentTeam?.name?.[0]?.toUpperCase() || 'T'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{currentTeam?.name || 'Select Team'}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => switchTeam(team)}
              className="flex items-center gap-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={team.avatar || ''} alt={team.name} />
                <AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <div className="truncate font-medium">{team.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  Owner: {team.owner.username}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          {teams.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={() => setShowCreateModal(true)}
            disabled={teamStats ? !teamStats.canCreateMore : false}
            className="flex items-center gap-2 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </>
  );
}
