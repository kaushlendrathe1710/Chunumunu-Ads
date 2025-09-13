import React, { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TeamAPI from '@/api/teamApi';
import { QK } from '@/api/queryKeys';

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamModal({ open, onOpenChange }: CreateTeamModalProps) {
  const { teamStats } = useTeam();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: '',
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; avatar?: string }) =>
      TeamAPI.createTeam(payload as any),
    onSuccess: () => {
      toast.success('Team created successfully');
      queryClient.invalidateQueries({ queryKey: QK.teams() });
      queryClient.invalidateQueries({ queryKey: QK.teamStats() });
      setFormData({ name: '', description: '', avatar: '' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error?.code === 'TEAM_LIMIT_EXCEEDED') {
        toast.error(
          `You've reached the maximum limit of ${teamStats?.maxTeamsAllowed || 5} teams.`
        );
      } else {
        toast.error(error?.message || 'Failed to create team');
      }
    },
  });

  const canCreateTeam = teamStats?.canCreateMore ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Team name is required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      avatar: formData.avatar.trim() || undefined,
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize your campaigns and ads.
            {teamStats && (
              <div className="mt-2 text-sm">
                <span
                  className={`font-medium ${!canCreateTeam ? 'text-red-600' : 'text-blue-600'}`}
                >
                  {teamStats.ownedTeams}/{teamStats.maxTeamsAllowed} teams created
                </span>
                {!canCreateTeam && (
                  <div className="mt-1 text-red-600">
                    You've reached the maximum limit of {teamStats.maxTeamsAllowed} teams.
                  </div>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              placeholder="Enter team name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter team description (optional)"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input
              id="avatar"
              type="url"
              placeholder="Enter avatar image URL (optional)"
              value={formData.avatar}
              onChange={(e) => handleInputChange('avatar', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !formData.name.trim() || !canCreateTeam}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
