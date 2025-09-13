import axios from 'axios';

export interface UpdateProfilePayload {
  username?: string;
  bio?: string;
  avatarFile?: File | null;
}

export async function updateUserProfile(payload: UpdateProfilePayload) {
  const formData = new FormData();
  if (payload.username) formData.append('username', payload.username);
  if (payload.bio) formData.append('bio', payload.bio);
  if (payload.avatarFile) formData.append('avatar', payload.avatarFile);

  try {
    const { data } = await axios.put('/api/users/profile', formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.user;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Failed to update profile';
    throw new Error(message);
  }
}
