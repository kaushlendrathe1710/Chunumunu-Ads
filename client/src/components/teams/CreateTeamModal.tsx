import React, { useState } from 'react';
import { useAppDispatch } from '@/store';
import { createTeam } from '@/store/slices/teamSlice';
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

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamModal({ open, onOpenChange }: CreateTeamModalProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Team name is required');
      return;
    }

    setLoading(true);

    try {
      await dispatch(
        createTeam({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          avatar: formData.avatar.trim() || undefined,
        })
      ).unwrap();

      toast.success('Team created successfully');

      setFormData({ name: '', description: '', avatar: '' });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team');
    } finally {
      setLoading(false);
    }
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
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
