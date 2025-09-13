import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionGate, RoleGate } from '@/components/common/PermissionGate';
import { useTeam } from '@/hooks/useTeam';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

export function CampaignExampleComponent() {
  const { currentTeam, userRole, userPermissions } = useTeam();

  if (!currentTeam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Management</CardTitle>
          <CardDescription>Please select a team to manage campaigns</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Management</CardTitle>
          <CardDescription>
            Current team: {currentTeam.name} | Your role: {userRole}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Your Permissions:</h4>
              <div className="flex flex-wrap gap-2">
                {userPermissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-md bg-primary/10 px-2 py-1 text-sm text-primary"
                  >
                    {permission.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Available Actions:</h4>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <PermissionGate permission="create_campaign">
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="view_campaign"
                  fallback={
                    <Button disabled className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      View Campaign
                    </Button>
                  }
                >
                  <Button variant="outline" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    View Campaign
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="edit_campaign"
                  fallback={
                    <Button disabled variant="outline" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Campaign
                    </Button>
                  }
                >
                  <Button variant="outline" className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Campaign
                  </Button>
                </PermissionGate>

                <PermissionGate
                  permission="delete_campaign"
                  fallback={
                    <Button disabled variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Campaign
                    </Button>
                  }
                >
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Campaign
                  </Button>
                </PermissionGate>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Role-based Access:</h4>
              <div className="space-y-2">
                <RoleGate
                  allowedRoles={['owner', 'admin']}
                  fallback={
                    <p className="text-sm text-muted-foreground">
                      Only owners and admins can access advanced settings
                    </p>
                  }
                >
                  <div className="rounded-md border bg-green-50 p-3 dark:bg-green-950">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ You have access to advanced campaign settings
                    </p>
                  </div>
                </RoleGate>

                <PermissionGate
                  permission="manage_team"
                  fallback={
                    <p className="text-sm text-muted-foreground">
                      You don't have permission to manage team settings
                    </p>
                  }
                >
                  <div className="rounded-md border bg-blue-50 p-3 dark:bg-blue-950">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ✅ You can manage team members and settings
                    </p>
                  </div>
                </PermissionGate>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
