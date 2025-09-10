import React, { useState, useEffect } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Users,
} from 'lucide-react';

interface TeamAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
  averageCPC: number;
  topCampaigns: Array<{
    id: string;
    name: string;
    impressions: number;
    clicks: number;
    spent: number;
  }>;
}

export default function TeamAnalytics() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTeam) {
      fetchAnalytics();
    }
  }, [currentTeam]);

  const fetchAnalytics = async () => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/analytics`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        // If endpoint doesn't exist yet, show placeholder data
        setAnalytics({
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalBudget: 0,
          totalSpent: 0,
          totalImpressions: 0,
          totalClicks: 0,
          averageCTR: 0,
          averageCPC: 0,
          topCampaigns: [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Show placeholder data on error
      setAnalytics({
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalBudget: 0,
        totalSpent: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCTR: 0,
        averageCPC: 0,
        topCampaigns: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(2)}%`;
  };

  if (!currentTeam) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Please select a team to view analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canViewAnalytics =
    userRole === 'owner' || userRole === 'admin' || hasPermission('view_campaign');

  if (!canViewAnalytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">You don't have permission to view team analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Analytics</h1>
          <p className="text-gray-600">Overview of your team's campaign performance</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {currentTeam?.name || 'No Team Selected'}
        </Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Loading analytics...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalCampaigns || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.activeCampaigns || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.totalBudget || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics?.totalSpent || 0)} spent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics?.totalImpressions || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Across all campaigns</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics?.totalClicks || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(analytics?.averageCTR || 0)} CTR
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Click-Through Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {formatPercentage(analytics?.averageCTR || 0)}
                    </span>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average CPC</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {formatCurrency(analytics?.averageCPC || 0)}
                    </span>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Budget Utilization</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {analytics?.totalBudget
                        ? formatPercentage((analytics.totalSpent || 0) / analytics.totalBudget)
                        : '0%'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Campaigns</CardTitle>
                <CardDescription>Campaigns with highest engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics?.topCampaigns || analytics.topCampaigns.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">No campaign data available yet</p>
                ) : (
                  <div className="space-y-3">
                    {(analytics?.topCampaigns || []).slice(0, 5).map((campaign, index) => (
                      <div key={campaign.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{campaign.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">
                            {formatNumber(campaign.clicks)} clicks
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(campaign.spent)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for Future Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Charts</CardTitle>
              <CardDescription>Detailed analytics visualization (Coming Soon)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
                <div className="text-center">
                  <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-gray-500">Interactive charts and graphs coming soon</p>
                  <p className="mt-2 text-xs text-gray-400">
                    This will include campaign performance over time, conversion funnels, and more
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
