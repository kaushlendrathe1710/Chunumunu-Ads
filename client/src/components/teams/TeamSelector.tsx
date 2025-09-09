import React, { useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { ChevronDown, Plus, Users } from 'lucide-react';
import { CreateTeamModal } from '.';

export function TeamSelector() {
  const { teams, currentTeam, switchTeam } = useTeam();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xs">
                  {currentTeam?.name?.[0]?.toUpperCase() || 'T'}
                </div>
              </Avatar>
              <span className="truncate">
                {currentTeam?.name || 'Select Team'}
              </span>
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
                <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xs">
                  {team.name[0].toUpperCase()}
                </div>
              </Avatar>
              <div className="flex-1 truncate">
                <div className="font-medium truncate">{team.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  Owner: {team.owner.username}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          {teams.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
