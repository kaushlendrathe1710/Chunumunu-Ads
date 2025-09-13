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
}

export interface CreateAdPayload {
  title: string;
  description?: string;
  categories: string[];
  tags: string[];
  ctaLink?: string;
  videoUrl: string;
  thumbnailUrl: string;
  budget?: number;
  campaignId: number; // convenience, though URL includes it
}

export interface UpdateAdPayload extends Partial<CreateAdPayload> {
  status?: AdDto['status'];
}

export class AdAPI {
  static async listTeamAds(teamId: number): Promise<AdDto[]> {
    const { data } = await apiClient.get<{ ads: AdDto[] }>(`/teams/${teamId}/ads`);
    return data.ads || [];
  }

  static async listCampaignAds(teamId: number, campaignId: number | string): Promise<AdDto[]> {
    const { data } = await apiClient.get<AdDto[]>(`/teams/${teamId}/campaigns/${campaignId}/ads`);
    return Array.isArray(data) ? data : (data as any).ads || [];
  }

  static async create(teamId: number, campaignId: number | string, payload: CreateAdPayload) {
    const { data } = await apiClient.post<AdDto>(
      `/teams/${teamId}/campaigns/${campaignId}/ads`,
      payload
    );
    return data;
  }

  static async update(
    teamId: number,
    campaignId: number | string,
    adId: number | string,
    payload: UpdateAdPayload
  ) {
    const { data } = await apiClient.put<AdDto>(
      `/teams/${teamId}/campaigns/${campaignId}/ads/${adId}`,
      payload
    );
    return data;
  }

  static async remove(teamId: number, campaignId: number | string, adId: number | string) {
    await apiClient.delete(`/teams/${teamId}/campaigns/${campaignId}/ads/${adId}`);
  }
}

export default AdAPI;
