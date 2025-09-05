import React, { PropsWithChildren } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '../common/Header';
import DashboardSidebar from '../common/DashboardSidebar';

export default function DashboardLayout({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <DashboardSidebar />

      <SidebarInset className="flex flex-col">
        <Header />
        <main className="min-w-0 flex-1 overflow-y-auto bg-background p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
