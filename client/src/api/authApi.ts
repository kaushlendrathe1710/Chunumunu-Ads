import axios from 'axios';

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
    const { data } = await axios.get<{ user: AuthUser }>('/api/auth/me', { withCredentials: true });
    return data.user || null;
  } catch {
    return null;
  }
}
