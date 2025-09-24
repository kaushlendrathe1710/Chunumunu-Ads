import { apiClient } from './apiClient';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await apiClient.get<{ user: AuthUser }>('/auth/me');
    return data.user || null;
  } catch {
    return null;
  }
}
