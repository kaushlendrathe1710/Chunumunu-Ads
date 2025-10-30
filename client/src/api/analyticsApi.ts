import { apiClient } from './apiClient';

export interface TeamAnalyticsDto {
  totalCampaigns: number;
  availableBudget: number;
  totalImpressions: number;
  topCampaigns: Array<{
    id: number;
    name: string;
    impressions: number;
  }>;
  topAds: Array<{
    id: number;
    title: string;
    campaignId: number;
    campaignName: string;
    impressions: number;
  }>;
  impressionsOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export interface CampaignAnalyticsDto {
  campaign: {
    id: number;
    name: string;
    status: string;
    budget: number;
    spent: number;
    remaining: number;
    startDate: Date | null;
    endDate: Date | null;
  };
  totalImpressions: number;
  totalAds: number;
  topAds: Array<{
    id: number;
    title: string;
    status: string;
    impressions: number;
  }>;
  impressionsOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export interface AdAnalyticsDto {
  ad: {
    id: number;
    title: string;
    description: string | null;
    status: string;
    budget: number;
    spent: number;
    remaining: number;
    campaignId: number;
    campaignName: string;
    campaignBudget: number;
  };
  totalImpressions: number;
  impressionsByAction: Array<{
    action: string;
    count: number;
  }>;
  impressionsByDevice: Array<{
    deviceType: string;
    count: number;
  }>;
  impressionsOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export class AnalyticsAPI {
  static async getTeamAnalytics(teamId: number): Promise<TeamAnalyticsDto> {
    const { data } = await apiClient.get<TeamAnalyticsDto>(`/teams/${teamId}/analytics`);
    return data;
  }

  static async getCampaignAnalytics(
    teamId: number,
    campaignId: number
  ): Promise<CampaignAnalyticsDto> {
    const { data } = await apiClient.get<CampaignAnalyticsDto>(
      `/teams/${teamId}/campaigns/${campaignId}/analytics`
    );
    return data;
  }

  static async getAdAnalytics(
    teamId: number,
    campaignId: number,
    adId: number
  ): Promise<AdAnalyticsDto> {
    const { data } = await apiClient.get<AdAnalyticsDto>(
      `/teams/${teamId}/campaigns/${campaignId}/ads/${adId}/analytics`
    );
    return data;
  }
}

export default AnalyticsAPI;
