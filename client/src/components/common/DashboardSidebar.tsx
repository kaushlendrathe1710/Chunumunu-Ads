import React from 'react';
import logo from '@client/public/logo.svg';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Home, Tag, Users, Settings, PlayCircle, Wallet, Building } from 'lucide-react';
import { useTeam } from '@/hooks/useTeam';
import { Separator } from '@radix-ui/react-select';
import { teamRole } from '@shared/constants';

export default function DashboardSidebar() {
  const { user } = useAuth();
  const { currentTeam, userRole } = useTeam();
  const [location] = useLocation();

  const isActive = (path: string) => location === path || location.startsWith(path + '/');

  // Only show team management if user is on a team and has admin+ permissions
  const hasTeamManagement = currentTeam && (userRole === teamRole.owner || userRole === teamRole.admin);

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-2">
        <Link href="/" className="flex h-14 items-center gap-2">
          <img src={logo} alt="Logo" className="h-8 w-8" />
          <span className="hidden text-nowrap font-semibold md:block">Chunumunu-Ads</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <div className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/')}>
                <Link href="/" className="flex items-center">
                  <Home className="mr-2 size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/wallet')}>
                <Link href="/wallet" className="flex items-center">
                  <Wallet className="mr-2 size-4" />
                  <span>Wallet</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Teams Management Section */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/manage-teams')}>
                <Link href="/manage-teams" className="flex items-center">
                  <Building className="mr-2 size-4" />
                  <span>Manage Teams</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Current Team Section - Only shown when user has a current team */}
            {/* Current Team Section - Only shown when user has a current team */}
            {currentTeam && (
              <>
                <SidebarSeparator />
                <div className="truncate px-2 py-1 text-xs font-semibold tracking-wider text-gray-500">
                  Team: {currentTeam.name}
                </div>

                {hasTeamManagement && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/team/members')}>
                      <Link href="/team/settings" className="flex items-center">
                        <Users className="mr-2 size-4" />
                        <span>Team Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/team/campaigns')}>
                    <Link href="/team/campaigns" className="flex items-center">
                      <Tag className="mr-2 size-4" />
                      <span>Campaigns</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/team/ads')}>
                    <Link href="/team/ads" className="flex items-center">
                      <PlayCircle className="mr-2 size-4" />
                      <span>Team Ads</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/team/analytics')}>
                    <Link href="/team/analytics" className="flex items-center">
                      <Settings className="mr-2 size-4" />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
