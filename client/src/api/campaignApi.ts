import { apiClient } from './apiClient';
// Basic campaign types (can be replaced with shared types if/when added there)
export interface CampaignDto {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget?: string | null;
  spent?: string | null;
  impressions?: number;
  clicks?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };
  team?: {
    id: number;
    name: string;
  };
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  budget: number;
  startDate?: string; // ISO
  endDate?: string; // ISO
  status?: 'draft' | 'active' | 'paused' | 'completed';
}

export interface UpdateCampaignPayload extends Partial<CreateCampaignPayload> {}

export interface TeamWalletBalance {
  balance: string;
  currency: string;
  teamId: number;
  teamName: string;
}

export interface DeleteCampaignResponse {
  message: string;
  refundAmount: number;
}

class CampaignAPI {
  static async list(teamId: number): Promise<CampaignDto[]> {
    const { data } = await apiClient.get<{ campaigns: CampaignDto[] }>(
      `/teams/${teamId}/campaigns`
    );
    return data.campaigns || [];
  }

  static async create(teamId: number, payload: CreateCampaignPayload): Promise<CampaignDto> {
    const { data } = await apiClient.post<CampaignDto>(`/teams/${teamId}/campaigns`, payload);
    return data;
  }

  static async update(
    teamId: number,
    campaignId: number | string,
    payload: UpdateCampaignPayload
  ): Promise<CampaignDto> {
    const { data } = await apiClient.put<CampaignDto>(
      `/teams/${teamId}/campaigns/${campaignId}`,
      payload
    );
    return data;
  }

  static async delete(
    teamId: number,
    campaignId: number | string
  ): Promise<DeleteCampaignResponse> {
    const { data } = await apiClient.delete<DeleteCampaignResponse>(
      `/teams/${teamId}/campaigns/${campaignId}`
    );
    return data;
  }

  static async getTeamWalletBalance(teamId: number): Promise<TeamWalletBalance> {
    const { data } = await apiClient.get<TeamWalletBalance>(`/teams/${teamId}/wallet-balance`);
    return data;
  }
}

export default CampaignAPI;
