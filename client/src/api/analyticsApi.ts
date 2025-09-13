import { apiClient } from './apiClient';

export interface TeamAnalyticsDto {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
  averageCPC: number;
  topCampaigns: Array<{
    id: number;
    name: string;
    impressions: number;
    clicks: number;
    spent: number;
  }>;
}

export class AnalyticsAPI {
  static async getTeamAnalytics(teamId: number): Promise<TeamAnalyticsDto> {
    const { data } = await apiClient.get<TeamAnalyticsDto>(`/teams/${teamId}/analytics`);
    return data;
  }
}

export default AnalyticsAPI;
