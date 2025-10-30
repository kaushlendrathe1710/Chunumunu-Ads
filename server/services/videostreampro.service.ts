import axios from 'axios';

// Environment variables for VideoStreamPro SSO
const VIDEOSTREAMPRO_AUTH_URL = process.env.VIDEOSTREAMPRO_AUTH_URL!;
const VIDEOSTREAMPRO_API_KEY = process.env.VIDEOSTREAMPRO_API_KEY!;

// Extract base URL from auth URL (remove /api/auth part)
const VIDEOSTREAMPRO_BASE_URL = VIDEOSTREAMPRO_AUTH_URL.replace(/\/api\/auth$/, '');

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

export interface AdConfirmationData {
  videoId: string;
  viewerId?: string;
  adId: number;
  costCents: number;
}

export interface AdConfirmationResponse {
  success: boolean;
  message: string;
  monetizationEnabled: boolean;
  data?: {
    earningId: number;
    creatorId: number;
    videoId: number;
    amountCents: number;
    adCostCents: number;
    revenueShare: number;
  };
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

  /**
   * Notify VideoStreamPro about ad completion for monetization
   * This is called after an ad is successfully completed/viewed
   */
  static async notifyAdConfirmation(data: AdConfirmationData): Promise<AdConfirmationResponse> {
    try {
      console.log(
        `[VideoStreamPro API] Sending ad confirmation request:`,
        JSON.stringify(data, null, 2)
      );

      const response = await axios.post(
        `${VIDEOSTREAMPRO_BASE_URL}/api/monetization/ad-confirmed`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': VIDEOSTREAMPRO_API_KEY,
          },
          timeout: 5000, // 5 second timeout
        }
      );

      console.log(
        `[VideoStreamPro API] Response received:`,
        JSON.stringify(response.data, null, 2)
      );

      return response.data;
    } catch (error: any) {
      // Log error but don't throw - monetization failure shouldn't break ad tracking
      console.error('[VideoStreamPro API] Error during ad confirmation:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        videoId: data.videoId,
        adId: data.adId,
      });

      // Return a failure response instead of throwing
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to notify ad confirmation',
        monetizationEnabled: false,
      };
    }
  }
}