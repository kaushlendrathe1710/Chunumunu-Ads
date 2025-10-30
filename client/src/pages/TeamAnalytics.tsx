import React from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import AnalyticsAPI, { TeamAnalyticsDto } from '@/api/analyticsApi';
import { permission, teamRole } from '@shared/constants';
import { BarChart3, TrendingUp, Eye, DollarSign, Award, LineChart } from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type TeamAnalytics = TeamAnalyticsDto;

export default function TeamAnalytics() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const { data: analytics, isLoading: loading } = useQuery({
    queryKey: currentTeam ? QK.analytics(currentTeam.id) : ['team', 'analytics', 'noop'],
    queryFn: () =>
      currentTeam ? AnalyticsAPI.getTeamAnalytics(currentTeam.id) : Promise.resolve(undefined),
    enabled: !!currentTeam,
    retry: 1,
    staleTime: 60_000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
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
    userRole === teamRole.owner ||
    userRole === teamRole.admin ||
    hasPermission(permission.view_analytics);

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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalCampaigns || 0}</div>
                <p className="text-xs text-muted-foreground">Active campaigns in team</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Budget</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.availableBudget || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Team creator's wallet balance</p>
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
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Top Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top 3 Performing Campaigns
                </CardTitle>
                <CardDescription>Campaigns with highest impressions</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics?.topCampaigns || analytics.topCampaigns.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">No campaign data available yet</p>
                ) : (
                  <div className="space-y-3">
                    {(analytics?.topCampaigns || []).map((campaign, index) => (
                      <div key={campaign.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              index === 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : index === 1
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{campaign.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">
                            {formatNumber(campaign.impressions)}
                          </div>
                          <div className="text-xs text-gray-500">impressions</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Ads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  Top 3 Performing Ads
                </CardTitle>
                <CardDescription>Ads with highest impressions</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics?.topAds || analytics.topAds.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">No ad data available yet</p>
                ) : (
                  <div className="space-y-3">
                    {(analytics?.topAds || []).map((ad, index) => (
                      <div key={ad.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              index === 0
                                ? 'bg-blue-100 text-blue-700'
                                : index === 1
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{ad.title}</div>
                            <div className="text-xs text-gray-500">{ad.campaignName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatNumber(ad.impressions)}</div>
                          <div className="text-xs text-gray-500">impressions</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Impressions Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Impressions Over Time
              </CardTitle>
              <CardDescription>Last 30 days impression trends</CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics?.impressionsOverTime || analytics.impressionsOverTime.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
                  <div className="text-center">
                    <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">No impression data available yet</p>
                    <p className="mt-2 text-xs text-gray-400">
                      Data will appear once ads start receiving impressions
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={analytics.impressionsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value: string) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [formatNumber(value), 'Impressions']}
                      labelFormatter={(label: string) => {
                        const date = new Date(label);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
