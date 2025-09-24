import axios from 'axios';

// Environment variables for VideoStreamPro SSO
const VIDEOSTREAMPRO_AUTH_URL = process.env.VIDEOSTREAMPRO_AUTH_URL!;
const VIDEOSTREAMPRO_API_KEY = process.env.VIDEOSTREAMPRO_API_KEY!;

export interface VideoStreamProUser {
  id: number;
  email: string;
  username: string;
  avatar?: string;
}

export interface VideoStreamProUserResponse {
  success: boolean;
  message: string;
  verified: boolean;
  user: VideoStreamProUser;
}

export class VideoStreamProService {
  /**
   * Verify token and get user data from VideoStreamPro
   * This is called by our server after client gets the verification token
   */
  static async verifyUserToken(verificationToken: string): Promise<VideoStreamProUser> {
    try {
      const response = await axios.post(`${VIDEOSTREAMPRO_AUTH_URL}/verify-token`, {
        token: verificationToken,
        apiKey: VIDEOSTREAMPRO_API_KEY,
      });

      const data: VideoStreamProUserResponse = response.data;

      if (!data.success || !data.verified || !data.user) {
        throw new Error(data.message || 'Token verification failed');
      }

      return data.user;
    } catch (error: any) {
      console.error('VideoStreamPro verifyUserToken error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify token');
    }
  }
}