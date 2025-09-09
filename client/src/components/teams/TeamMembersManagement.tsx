import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
} from '@/store/slices/teamSlice';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, UserPlus, Trash2, Edit } from 'lucide-react';
import { TeamRole, Permission } from '@shared/types';
import { toast } from 'react-toastify';

const roleOptions: { value: TeamRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

const permissionOptions: { value: Permission; label: string; description: string }[] = [
  { value: 'create_campaign', label: 'Create Campaigns', description: 'Can create new campaigns' },
  { value: 'edit_campaign', label: 'Edit Campaigns', description: 'Can modify existing campaigns' },
  { value: 'delete_campaign', label: 'Delete Campaigns', description: 'Can delete campaigns' },
  { value: 'view_campaign', label: 'View Campaigns', description: 'Can view campaigns' },
  { value: 'create_ad', label: 'Create Ads', description: 'Can create new ads' },
  { value: 'edit_ad', label: 'Edit Ads', description: 'Can modify existing ads' },
  { value: 'delete_ad', label: 'Delete Ads', description: 'Can delete ads' },
  { value: 'view_ad', label: 'View Ads', description: 'Can view ads' },
  {
    value: 'manage_team',
    label: 'Manage Team',
    description: 'Can manage team members and settings',
  },
];

export function TeamMembersManagement() {
  const dispatch = useAppDispatch();
  const { currentTeam, hasPermission } = useTeam();
  const { teamMembers, membersLoading, membersError } = useAppSelector((state) => state.team);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as TeamRole,
    permissions: [] as Permission[],
  });

  useEffect(() => {
    if (currentTeam) {
      dispatch(fetchTeamMembers(currentTeam.id));
    }
  }, [dispatch, currentTeam]);

  const handleInviteMember = async () => {
    if (!currentTeam || !inviteForm.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await dispatch(
        inviteTeamMember({
          teamId: currentTeam.id,
          memberData: {
            email: inviteForm.email.trim(),
            role: inviteForm.role,
            permissions: inviteForm.permissions,
          },
        })
      ).unwrap();

      toast.success('Member invited successfully');
      setInviteForm({ email: '', role: 'member', permissions: [] });
      setShowInviteModal(false);

      // Refresh members list
      dispatch(fetchTeamMembers(currentTeam.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite member');
    }
  };

  const handleUpdateMember = async () => {
    if (!currentTeam || !selectedMember) return;

    try {
      await dispatch(
        updateTeamMember({
          teamId: currentTeam.id,
          userId: selectedMember.userId,
          updates: {
            role: selectedMember.role,
            permissions: selectedMember.permissions,
          },
        })
      ).unwrap();

      toast.success('Member updated successfully');
      setShowEditModal(false);
      setSelectedMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update member');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!currentTeam) return;

    if (confirm('Are you sure you want to remove this member from the team?')) {
      try {
        await dispatch(
          removeTeamMember({
            teamId: currentTeam.id,
            userId,
          })
        ).unwrap();

        toast.success('Member removed successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to remove member');
      }
    }
  };

  const getRoleBadgeVariant = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'member':
        return 'outline';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const canManageTeam = hasPermission('manage_team');

  if (!currentTeam) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Please select a team to manage members</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Members</h2>
          <p className="text-muted-foreground">Manage your team members and their permissions</p>
        </div>

        {canManageTeam && (
          <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to add a new member to your team.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Role
                  </label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value: TeamRole) =>
                      setInviteForm((prev) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Permissions
                  </label>
                  <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto">
                    {permissionOptions.map((permission) => (
                      <div key={permission.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.value}
                          checked={inviteForm.permissions.includes(permission.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setInviteForm((prev) => ({
                                ...prev,
                                permissions: [...prev.permissions, permission.value],
                              }));
                            } else {
                              setInviteForm((prev) => ({
                                ...prev,
                                permissions: prev.permissions.filter((p) => p !== permission.value),
                              }));
                            }
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={permission.value}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInviteMember}
                    disabled={!inviteForm.email.trim()}
                    className="flex-1"
                  >
                    Send Invitation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {membersError && (
        <div className="rounded-md bg-destructive/15 px-4 py-2 text-destructive">
          {membersError}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Joined</TableHead>
              {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersLoading ? (
              <TableRow>
                <TableCell colSpan={canManageTeam ? 5 : 4} className="py-8 text-center">
                  Loading members...
                </TableCell>
              </TableRow>
            ) : teamMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageTeam ? 5 : 4} className="py-8 text-center">
                  No team members found
                </TableCell>
              </TableRow>
            ) : (
              teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <div className="flex h-full w-full items-center justify-center bg-primary text-xs text-primary-foreground">
                          {member.user.username[0].toUpperCase()}
                        </div>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.user.username}</div>
                        <div className="text-sm text-muted-foreground">{member.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.permissions?.slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permissionOptions.find((p) => p.value === permission)?.label}
                        </Badge>
                      ))}
                      {member.permissions && member.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  {canManageTeam && (
                    <TableCell className="text-right">
                      {member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.userId)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Member Modal */}
      {selectedMember && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update {selectedMember.user.username}'s role and permissions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Role
                </label>
                <Select
                  value={selectedMember.role}
                  onValueChange={(value: TeamRole) =>
                    setSelectedMember((prev: any) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Permissions
                </label>
                <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto">
                  {permissionOptions.map((permission) => (
                    <div key={permission.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${permission.value}`}
                        checked={selectedMember.permissions?.includes(permission.value) || false}
                        onCheckedChange={(checked) => {
                          const currentPermissions = selectedMember.permissions || [];
                          if (checked) {
                            setSelectedMember((prev: any) => ({
                              ...prev,
                              permissions: [...currentPermissions, permission.value],
                            }));
                          } else {
                            setSelectedMember((prev: any) => ({
                              ...prev,
                              permissions: currentPermissions.filter(
                                (p: any) => p !== permission.value
                              ),
                            }));
                          }
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`edit-${permission.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateMember} className="flex-1">
                  Update Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
