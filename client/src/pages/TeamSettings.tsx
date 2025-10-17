import React, { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPlus, MoreVertical, Settings, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { TeamMemberWithUser, TeamRole, Permission } from '@shared/types';
import { limits, permission, teamRole } from '@shared/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TeamAPI from '@/api/teamApi';
import { QK } from '@/api/queryKeys';

export default function TeamSettings() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const [inviteEmail, setInviteEmail] = useState('');
  const [editPermissionsOpen, setEditPermissionsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberWithUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Permission[]>([]);

  // Available permissions with descriptions using shared constants
  const availablePermissions = [
    {
      id: permission.view_campaign,
      label: 'View Campaigns',
      description: 'Can view campaign details',
    },
    {
      id: permission.create_campaign,
      label: 'Create Campaigns',
      description: 'Can create new campaigns',
    },
    {
      id: permission.edit_campaign,
      label: 'Edit Campaigns',
      description: 'Can modify existing campaigns',
    },
    {
      id: permission.delete_campaign,
      label: 'Delete Campaigns',
      description: 'Can delete campaigns',
    },
    { id: permission.view_ad, label: 'View Ads', description: 'Can view ad details' },
    { id: permission.create_ad, label: 'Create Ads', description: 'Can create new ads' },
    { id: permission.edit_ad, label: 'Edit Ads', description: 'Can modify existing ads' },
    { id: permission.delete_ad, label: 'Delete Ads', description: 'Can delete ads' },
    { id: permission.manage_team, label: 'Manage Team', description: 'Can manage team members' },
  ];

  const queryClient = useQueryClient();
  const membersQuery = useQuery<TeamMemberWithUser[]>({
    queryKey: currentTeam ? QK.teamMembers(currentTeam.id) : ['teamMembers', 'noop'],
    queryFn: () =>
      currentTeam ? TeamAPI.getTeamMembers(currentTeam.id) : (Promise.resolve([]) as any),
    enabled: !!currentTeam,
  });

  const inviteMutation = useMutation({
    mutationFn: (vars: { email: string }) =>
      TeamAPI.inviteMember(currentTeam!.id, {
        email: vars.email,
        role: 'viewer',
        permissions: [permission.view_campaign, permission.view_ad],
      }),
    onSuccess: () => {
      toast.success(`Added ${inviteEmail} to the team`);
      setInviteEmail('');
      if (currentTeam) queryClient.invalidateQueries({ queryKey: QK.teamMembers(currentTeam.id) });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add member to team'),
  });

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== teamRole.owner && !hasPermission(permission.manage_team)) {
      toast.error('You do not have permission to manage team.');
      return;
    }
    if (!currentTeam || !inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim() });
  };

  const roleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: number; newRole: string }) =>
      TeamAPI.updateMember(currentTeam!.id, userId, {
        role: newRole as TeamRole,
        permissions:
          newRole === teamRole.admin
            ? [permission.view_campaign, permission.view_ad, permission.manage_team]
            : [permission.view_campaign, permission.view_ad],
      }),
    onSuccess: () => {
      toast.success('Member role updated');
      if (currentTeam) queryClient.invalidateQueries({ queryKey: QK.teamMembers(currentTeam.id) });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update role'),
  });

  const handleRoleChange = (userId: number, newRole: string) => {
    if (!currentTeam) return;
    roleMutation.mutate({ userId, newRole });
  };

  const removeMutation = useMutation({
    mutationFn: (userId: number) => TeamAPI.removeMember(currentTeam!.id, userId),
    onSuccess: () => {
      toast.success('Member removed successfully');
      if (currentTeam) queryClient.invalidateQueries({ queryKey: QK.teamMembers(currentTeam.id) });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to remove member'),
  });

  const handleRemoveMember = (userId: number) => {
    if (!currentTeam || !confirm('Are you sure you want to remove this member?')) return;
    removeMutation.mutate(userId);
  };

  const handleEditPermissions = (member: TeamMemberWithUser) => {
    setSelectedMember(member);
    setEditingPermissions([...(member.permissions || [])]);
    setEditPermissionsOpen(true);
  };

  const handlePermissionToggle = (permissionId: Permission) => {
    setEditingPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((p) => p !== permissionId) : [...prev, permissionId]
    );
  };

  const permissionsMutation = useMutation({
    mutationFn: () =>
      TeamAPI.updateMember(currentTeam!.id, selectedMember!.userId, {
        role: selectedMember!.role,
        permissions: editingPermissions,
      }),
    onSuccess: () => {
      toast.success('Permissions updated successfully');
      setEditPermissionsOpen(false);
      setSelectedMember(null);
      setEditingPermissions([]);
      if (currentTeam) queryClient.invalidateQueries({ queryKey: QK.teamMembers(currentTeam.id) });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update permissions'),
  });

  const handleSavePermissions = () => {
    if (!currentTeam || !selectedMember) return;
    permissionsMutation.mutate();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Please select a team to manage members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-gray-600">Manage your team members and their roles</p>
        </div>
      </div>

      {/* Invite Member Form */}
      {(userRole === teamRole.owner || userRole === teamRole.admin) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteMember} className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button
                type="submit"
                disabled={
                  inviteMutation.isPending ||
                  !inviteEmail.trim() ||
                  (membersQuery.data?.length || 0) >= limits.maxMembersPerTeam
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                {inviteMutation.isPending ? 'Adding...' : 'Add Member'}
              </Button>
            </form>
          </CardContent>
          {membersQuery.data
            ? membersQuery.data.length >= limits.maxMembersPerTeam
            : true && (
                <CardFooter>
                  <p className="text-sm text-destructive">
                    You have reached the maximum number of members for this team.
                  </p>
                </CardFooter>
              )}
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Team Members ({membersQuery.data?.length || 0}/{limits.maxMembersPerTeam})
          </CardTitle>
          <CardDescription>
            Current members of team: {currentTeam?.name || 'Unknown Team'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Loading team members...</p>
            </div>
          ) : membersQuery.error ? (
            <div className="py-8 text-center">
              <p className="text-red-500">Failed to load team members</p>
            </div>
          ) : !membersQuery.data || membersQuery.data.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">No team members found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(membersQuery.data || []).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={
                          member.user?.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${member.user?.email}`
                        }
                      />
                      <AvatarFallback>
                        {member.user?.username?.charAt(0)?.toUpperCase() ||
                          member.user?.email?.charAt(0)?.toUpperCase() ||
                          'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user?.username || member.user?.email}</p>
                      <p className="text-sm text-gray-500">{member.user?.email}</p>
                      <p className="text-xs text-gray-400">
                        Joined {new Date(member.joinedAt || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>

                    {/* Only owners and member with manage_team permission can manage team members */}
                    {hasPermission(permission.manage_team) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPermissions(member)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.userId, 'admin')}
                          >
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.userId, 'member')}
                          >
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.userId, 'viewer')}
                          >
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.userId)}
                            className="text-red-600"
                          >
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={editPermissionsOpen} onOpenChange={setEditPermissionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Manage permissions for {selectedMember?.user?.username || selectedMember?.user?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3">
              {availablePermissions.map((permission) => (
                <div key={permission.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission.id}
                    checked={editingPermissions.includes(permission.id)}
                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={permission.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {permission.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSavePermissions} 
                className="flex-1"
                disabled={permissionsMutation.isPending}
              >
                {permissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditPermissionsOpen(false);
                  setSelectedMember(null);
                  setEditingPermissions([]);
                }}
                disabled={permissionsMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
