import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { updateUserProfile } from '@/api/userApi';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const profileSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  bio: z.string().max(500).optional(),
  avatarFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar || undefined);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
    setValue,
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || '',
      username: user?.username || '',
      bio: user?.bio || '',
    },
  });

  useEffect(() => {
    reset({ email: user?.email || '', username: user?.username || '', bio: user?.bio || '' });
    setAvatarPreview(user?.avatar || undefined);
  }, [user, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateUserProfile({
        username: values.username,
        bio: values.bio,
        avatarFile: (values as any).avatarFile,
      });
      toast.success('Profile updated');
      // Update react-query cache immediately (stale-while-revalidate)
      queryClient.setQueryData(QK.user(), {
        user: {
          ...(user || {}),
          ...{ avatar: avatarPreview, username: values.username, bio: values.bio },
        },
      });
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: QK.user() });
      await refresh();
      reset({ email: user?.email || '', username: values.username, bio: values.bio || '' });
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">View and update your account details</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Email cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setValue('avatarFile', file as any, { shouldDirty: true });
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setAvatarPreview(url);
                    } else {
                      setAvatarPreview(user?.avatar || undefined);
                    }
                  }}
                />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <Input {...register('email')} disabled />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <Input {...register('username')} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Bio</label>
                  <Textarea rows={4} {...register('bio')} placeholder="Write something..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
