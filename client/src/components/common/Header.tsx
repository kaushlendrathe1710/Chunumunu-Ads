import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { Users, Settings } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import { TeamSelector } from '@/components/teams';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { permission } from '@shared/constants';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentTeam, hasPermission, loading } = useTeam();

  const [location, navigate] = useLocation();

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
          {isAuthenticated && <TeamSelector />}
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
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="max-w-[10ch] truncate font-medium">{user?.username}</span>
                    <span className="max-w-[20ch] truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />

                {/* Team Management */}
                {currentTeam && hasPermission(permission.manage_team) && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Team Management</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => navigate('/manage-teams')}
                        className="cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Manage Members
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate('/team/settings')}
                        className="cursor-pointer"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Team Settings
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <i className="ri-user-settings-line mr-2" /> Profile
                </DropdownMenuItem>
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
    </header>
  );
}
