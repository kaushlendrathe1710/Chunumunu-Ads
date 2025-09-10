import React, { useState, useEffect } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { UserPlus, MoreVertical, Mail, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import { TeamMemberWithUser, TeamRole, Permission } from '@shared/types';
import { permission } from '@shared/constants';

export default function TeamMembers() {
  const { currentTeam, userRole } = useTeam();
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (currentTeam) {
      fetchTeamMembers();
    }
  }, [currentTeam]);

  const fetchTeamMembers = async () => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/members`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        console.error('Failed to fetch team members:', response.status);
        setMembers([]);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      toast.error('Failed to load team members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !inviteEmail.trim()) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: 'member', // Default role for new invites
          permissions: [permission.view_campaign, permission.view_ad], // Default permissions
        }),
      });

      if (response.ok) {
        toast.success('Invitation sent successfully');
        setInviteEmail('');
        fetchTeamMembers(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      toast.error('Failed to send invitation');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          role: newRole,
          permissions:
            newRole === 'admin'
              ? [
                  permission.create_campaign,
                  permission.edit_campaign,
                  permission.delete_campaign,
                  permission.view_campaign,
                  permission.create_ad,
                  permission.edit_ad,
                  permission.delete_ad,
                  permission.view_ad,
                ]
              : [permission.view_campaign, permission.view_ad],
        }),
      });

      if (response.ok) {
        toast.success('Member role updated');
        fetchTeamMembers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!currentTeam || !confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Member removed successfully');
        fetchTeamMembers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
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

  const handleSavePermissions = async () => {
    if (!currentTeam || !selectedMember) return;

    try {
      const response = await fetch(
        `/api/teams/${currentTeam.id}/members/${selectedMember.userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            role: selectedMember.role,
            permissions: editingPermissions,
          }),
        }
      );

      if (response.ok) {
        toast.success('Permissions updated successfully');
        setEditPermissionsOpen(false);
        setSelectedMember(null);
        setEditingPermissions([]);
        fetchTeamMembers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Failed to update permissions:', error);
      toast.error('Failed to update permissions');
    }
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
      {(userRole === 'owner' || userRole === 'admin') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite New Member
            </CardTitle>
            <CardDescription>Send an invitation to add a new member to your team</CardDescription>
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
              <Button type="submit" disabled={!inviteEmail.trim()}>
                <Mail className="mr-2 h-4 w-4" />
                Send Invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members?.length || 0})</CardTitle>
          <CardDescription>
            Current members of {currentTeam?.name || 'Unknown Team'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Loading team members...</p>
            </div>
          ) : !members || members.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">No team members found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(members || []).map((member) => (
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

                    {/* Only owners can manage other members */}
                    {userRole === 'owner' && member.role !== 'owner' && (
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
              <Button onClick={handleSavePermissions} className="flex-1">
                Save Permissions
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditPermissionsOpen(false);
                  setSelectedMember(null);
                  setEditingPermissions([]);
                }}
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
