import React, { PropsWithChildren } from 'react';
import logo from '@client/public/logo.svg';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Home, UploadCloud, Tag } from 'lucide-react';

export default function DashboardSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => location === path || location.startsWith(path + '/');

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
              <SidebarMenuButton asChild isActive={isActive('/upload')}>
                <Link href="/upload" className="flex items-center">
                  <UploadCloud className="mr-2 size-4" />
                  <span>Upload</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/ads')}>
                <Link href="/ads" className="flex items-center">
                  <Tag className="mr-2 size-4" />
                  <span>My Ads</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
