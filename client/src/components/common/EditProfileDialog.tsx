import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateUserProfile } from '@/api/userApi';
import { useAppSelector } from '@/store';
import { toast } from 'react-toastify';

const schema = z.object({
  username: z.string().min(3, 'Too short').max(50, 'Too long').optional(),
  bio: z.string().max(500).optional(),
  avatarFile: z.any().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated?: () => void;
}

export const EditProfileDialog: React.FC<Props> = ({ open, onOpenChange, onUpdated }) => {
  const { user } = useAppSelector((s) => s.auth);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: user?.username || '', bio: '', avatarFile: undefined },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateUserProfile({
        username: values.username,
        bio: values.bio,
        avatarFile: (values as any).avatarFile,
      });
      toast.success('Profile updated');
      onOpenChange(false);
      onUpdated?.();
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register('username')} />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} {...register('bio')} />
            {errors.bio && <p className="mt-1 text-xs text-red-500">{errors.bio.message}</p>}
          </div>
          <div>
            <Label htmlFor="avatar">Avatar</Label>
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={(e) => setValue('avatarFile', e.target.files?.[0])}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
