import { apiClient } from './apiClient';

export interface AdDto {
  id: number;
  title: string;
  description?: string;
  categories: string[];
  tags: string[];
  ctaLink?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'rejected' | 'under_review';
  budget?: string | null;
  spent?: string | null;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  campaignId: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };
  campaign?: {
    id: number;
    name: string;
    teamId: number;
  };
}

export interface CreateAdPayload {
  title: string;
  description?: string;
  categories: string[];
  tags: string[];
  ctaLink?: string;
  videoUrl: string;
  thumbnailUrl: string;
  budget?: number; // undefined or -1 means unlimited (until campaign budget exhausted)
  status?: 'draft' | 'active' | 'paused' | 'completed';
}

export interface UpdateAdPayload {
  title?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  ctaLink?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  budget?: number;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'rejected' | 'under_review';
}

export interface AdBudgetInfo {
  campaignBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
  requestedBudget?: number;
}

export interface DeleteAdResponse {
  message: string;
  refundAmount: number;
}

export interface AdBudgetError {
  error: string;
  budgetInfo: {
    campaignBudget: number;
    allocatedBudget: number;
    remainingBudget: number;
    requestedBudget: number;
  };
}

export class AdAPI {
  /**
   * Get all ads for a team (across all campaigns)
   */
  static async listTeamAds(teamId: number): Promise<AdDto[]> {
    const { data } = await apiClient.get<{ ads: AdDto[] }>(`/teams/${teamId}/ads`);
    return data.ads || [];
  }

  /**
   * Get all ads for a specific campaign
   */
  static async listCampaignAds(teamId: number, campaignId: number | string): Promise<AdDto[]> {
    const { data } = await apiClient.get<AdDto[]>(`/teams/${teamId}/campaigns/${campaignId}/ads`);
    return Array.isArray(data) ? data : (data as any).ads || [];
  }

  /**
   * Get a specific ad by ID
   */
  static async getAd(
    teamId: number,
    campaignId: number | string,
    adId: number | string
  ): Promise<AdDto> {
    const { data } = await apiClient.get<AdDto>(
      `/teams/${teamId}/campaigns/${campaignId}/ads/${adId}`
    );
    return data;
  }

  /**
   * Create a new ad
   */
  static async create(
    teamId: number,
    campaignId: number | string,
    payload: CreateAdPayload
  ): Promise<AdDto> {
    const { data } = await apiClient.post<AdDto>(
      `/teams/${teamId}/campaigns/${campaignId}/ads`,
      payload
    );
    return data;
  }

  /**
   * Update an existing ad
   */
  static async update(
    teamId: number,
    campaignId: number | string,
    adId: number | string,
    payload: UpdateAdPayload
  ): Promise<AdDto> {
    const { data } = await apiClient.put<AdDto>(
      `/teams/${teamId}/campaigns/${campaignId}/ads/${adId}`,
      payload
    );
    return data;
  }

  /**
   * Delete an ad
   */
  static async remove(
    teamId: number,
    campaignId: number | string,
    adId: number | string
  ): Promise<DeleteAdResponse> {
    const { data } = await apiClient.delete<DeleteAdResponse>(
      `/teams/${teamId}/campaigns/${campaignId}/ads/${adId}`
    );
    return data;
  }

  /**
   * Get budget information for ad creation/validation
   */
  static async getBudgetInfo(
    teamId: number,
    campaignId: number | string,
    requestedBudget?: number
  ): Promise<AdBudgetInfo> {
    const params = requestedBudget ? { requestedBudget: requestedBudget.toString() } : {};
    const { data } = await apiClient.get<AdBudgetInfo>(
      `/teams/${teamId}/campaigns/${campaignId}/ads/budget-info`,
      { params }
    );
    return data;
  }
}

export default AdAPI;
