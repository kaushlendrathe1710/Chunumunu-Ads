import logo from '@client/public/logo.svg';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { cn } from '@/lib/utils';
import { Upload, Menu, Plus, Users, ChevronDown, Settings } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { CreateTeamModal } from '@/components/teams';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { teams, currentTeam, switchTeam, hasPermission } = useTeam();
  const [location, navigate] = useLocation();
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="z-20 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left section - Sidebar trigger & team selector */}
        <div className="flex items-center gap-3">
          <SidebarTrigger />

          {/* Team Selector */}
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {currentTeam ? currentTeam.name : 'Select Team'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {teams.length > 0 ? (
                  <>
                    {teams.map((team) => (
                      <DropdownMenuItem
                        key={team.id}
                        onClick={() => switchTeam(team)}
                        className={cn('cursor-pointer', currentTeam?.id === team.id && 'bg-accent')}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {team.userRole === 'owner'
                                ? 'Owner'
                                : team.userRole === 'admin'
                                  ? 'Admin'
                                  : team.userRole === 'member'
                                    ? 'Member'
                                    : 'Viewer'}
                            </div>
                          </div>
                          {currentTeam?.id === team.id && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                ) : (
                  <DropdownMenuItem disabled>No teams available</DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => setIsCreateTeamOpen(true)}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right section - User info & actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center p-2">
                  <Avatar className="mr-2 h-8 w-8">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.username}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />

                {/* Team Management */}
                {currentTeam && hasPermission('manage_team') && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Team Management</DropdownMenuLabel>
                      <DropdownMenuItem className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Members
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Team Settings
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <i className="ri-logout-box-line mr-2"></i> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth"
              className="flex items-center rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
            >
              <i className="ri-user-line mr-2"></i>
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      <CreateTeamModal open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen} />
    </header>
  );
}
