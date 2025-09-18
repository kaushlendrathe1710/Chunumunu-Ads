import React, { useState } from 'react';
import { CreateTeamModal } from '@/components/teams';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building,
  Plus,
  Users,
  Crown,
  UserCheck,
  Settings,
  MoreVertical,
  Trash2,
  Edit,
  Upload,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { teamRole, limits } from '@shared/constants';
import type { TeamWithUserRole } from '@shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TeamAPI from '@/api/teamApi';
import { QK } from '@/api/queryKeys';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function ManageTeams() {
  const { teams, currentTeam, switchTeam, teamStats, loading } = useTeam();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamWithUserRole | null>(null);
  const [editTarget, setEditTarget] = useState<TeamWithUserRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string>('');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case teamRole.owner:
        return <Crown className="size-4 text-yellow-500" />;
      case teamRole.admin:
        return <Settings className="size-4 text-blue-500" />;
      case teamRole.member:
        return <UserCheck className="size-4 text-green-500" />;
      default:
        return <Users className="size-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case teamRole.owner:
        return 'default';
      case teamRole.admin:
        return 'secondary';
      case teamRole.member:
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleSwitchTeam = (team: TeamWithUserRole) => {
    switchTeam(team);
  };

  const openEdit = (team: TeamWithUserRole) => {
    setEditTarget(team);
    setEditName(team.name);
    setEditDescription(team.description || '');
    setEditAvatarFile(null);
    setEditAvatarPreview((team as any).avatar || '');
  };

  const updateMutation = useMutation({
    mutationFn: ({ teamId, updates }: { teamId: number; updates: any }) =>
      TeamAPI.updateTeam(teamId, updates),
    onSuccess: async () => {
      toast.success('Team updated');
      await queryClient.invalidateQueries({ queryKey: QK.teams() });
      setEditTarget(null);
      setEditAvatarFile(null);
      setEditAvatarPreview('');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update team'),
  });

  const submitEdit = async () => {
    if (!editTarget) return;

    if (editAvatarFile) {
      // Use FormData if avatar file is selected
      const formData = new FormData();
      formData.append('name', editName);
      formData.append('description', editDescription);
      formData.append('avatar', editAvatarFile);

      updateMutation.mutate({
        teamId: editTarget.id,
        updates: formData,
      });
    } else {
      // Use regular object if no avatar file
      updateMutation.mutate({
        teamId: editTarget.id,
        updates: { name: editName, description: editDescription },
      });
    }
  };

  const handleEditAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error('Avatar file size must be less than 5MB');
        return;
      }
      setEditAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setEditAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeEditAvatar = () => {
    setEditAvatarFile(null);
    setEditAvatarPreview((editTarget as any)?.avatar || '');
  };

  const deleteMutation = useMutation({
    mutationFn: (teamId: number) => TeamAPI.deleteTeam(teamId),
    onSuccess: async () => {
      toast.success('Team deleted');
      await queryClient.invalidateQueries({ queryKey: QK.teams() });
      await queryClient.invalidateQueries({ queryKey: QK.teamStats() });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete team'),
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const leaveMutation = useMutation({
    mutationFn: (teamId: number) => TeamAPI.leaveTeam(teamId),
    onSuccess: async () => {
      toast.success('Left team successfully');
      await queryClient.invalidateQueries({ queryKey: QK.teams() });
      await queryClient.invalidateQueries({ queryKey: QK.teamStats() });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to leave team'),
  });

  const handleLeaveTeam = (team: TeamWithUserRole) => {
    if (confirm(`Are you sure you want to leave the team "${team.name}"?`)) {
      leaveMutation.mutate(team.id);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading your teams...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Teams</h1>
            {(teamStats ? !teamStats.canCreateMore : false) && (
              <p className="text-sm text-destructive">
                You have reached the maximum number of teams for your account.
              </p>
            )}
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={teamStats ? !teamStats.canCreateMore : false}
            className="flex items-center gap-2 disabled:cursor-not-allowed"
          >
            <Plus className="size-4" />
            Create Team
          </Button>
        </div>

        {/* Team Stats */}
        {teamStats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                <Building className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teams?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Teams you're part of</p>
              </CardContent>
            </Card>

            {teamStats && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Teams Owned</CardTitle>
                  <Crown className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamStats.ownedTeams}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of {teamStats.maxTeamsAllowed} maximum
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Teams List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Teams</h2>

          {teams && teams.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Card
                  key={team.id}
                  className={`transition-all hover:shadow-md ${
                    currentTeam?.id === team.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="size-10">
                          <AvatarImage src={team.avatar || ''} alt={team.name} />
                          <AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="max-w-[8ch] truncate text-lg">
                            {team.name}
                          </CardTitle>
                          {team.description && (
                            <CardDescription className="max-w-[12ch] truncate text-sm">
                              {team.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {team.userRole === teamRole.owner && (
                            <>
                              <DropdownMenuItem
                                onClick={() => openEdit(team)}
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 size-4" />
                                Edit Team
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(team)}
                                className="cursor-pointer text-red-600"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete Team
                              </DropdownMenuItem>
                            </>
                          )}
                          {team.userRole !== teamRole.owner && (
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600"
                              onClick={() => handleLeaveTeam(team)}
                            >
                              Leave Team
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(team.userRole)}
                        <Badge variant={getRoleBadgeVariant(team.userRole)}>{team.userRole}</Badge>
                      </div>

                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Users className="size-3" />
                        <span>{(team as any).memberCount || 1}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {currentTeam?.id === team.id ? (
                        <Button variant="outline" size="sm" disabled className="flex-1">
                          Current Team
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSwitchTeam(team)}
                          className="flex-1"
                        >
                          Switch to Team
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building className="mx-auto mb-4 size-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Teams Found</h3>
                <p className="mb-6 text-muted-foreground">
                  You don't have any teams yet. Create your first team to get started.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 size-4" />
                  Create Your First Team
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      <CreateTeamModal open={showCreateModal} onOpenChange={setShowCreateModal} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Team"
        description={`Are you sure you want to delete the team "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="destructive"
      />

      {/* Edit Team Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-avatar">Team Avatar</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={editAvatarPreview} alt="Team avatar preview" />
                  <AvatarFallback className="text-lg">
                    {editName ? editName.slice(0, 2).toUpperCase() : 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditAvatarChange}
                    className="hidden"
                    id="edit-avatar-input"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('edit-avatar-input')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Avatar
                    </Button>
                    {editAvatarFile && (
                      <Button type="button" variant="outline" size="sm" onClick={removeEditAvatar}>
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or GIF. Max size 5MB.</p>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
