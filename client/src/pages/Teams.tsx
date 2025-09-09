import React from 'react';
import { DashboardLayout } from '@/components';
import { TeamSelector, TeamMembersManagement } from '@/components/teams';
import { CampaignExampleComponent } from '@/components/common/CampaignExampleComponent';
import { useTeam } from '@/contexts/TeamContext';

export default function Teams() {
  const { currentTeam } = useTeam();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground">Manage your teams, members, and permissions</p>
          </div>
          <div className="w-64">
            <TeamSelector />
          </div>
        </div>

        {currentTeam ? (
          <div className="space-y-8">
            <CampaignExampleComponent />
            <TeamMembersManagement />
          </div>
        ) : (
          <div className="py-12 text-center">
            <h3 className="mb-2 text-xl font-semibold">No Team Selected</h3>
            <p className="mb-6 text-muted-foreground">
              Please select a team from the dropdown above or create a new one to get started.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
