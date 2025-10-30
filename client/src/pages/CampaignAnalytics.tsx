import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import AnalyticsAPI, { CampaignAnalyticsDto } from '@/api/analyticsApi';
import { permission, teamRole } from '@shared/constants';
import {
  BarChart3,
  TrendingUp,
  Eye,
  DollarSign,
  Calendar,
  ArrowLeft,
  Activity,
  Target,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function CampaignAnalytics() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const [, setLocation] = useLocation();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId ? parseInt(params.campaignId) : null;

  const { data: analytics, isLoading: loading } = useQuery({
    queryKey:
      currentTeam && campaignId
        ? QK.campaignAnalytics(currentTeam.id, campaignId)
        : ['campaign', 'analytics', 'noop'],
    queryFn: () =>
      currentTeam && campaignId
        ? AnalyticsAPI.getCampaignAnalytics(currentTeam.id, campaignId)
        : Promise.resolve(undefined),
    enabled: !!currentTeam && !!campaignId,
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

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Please select a team to view campaign analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaignId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Invalid campaign ID.</p>
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
            <p className="text-gray-500">You don't have permission to view analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/team/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Campaign Analytics</h1>
            {!loading && analytics?.campaign && (
              <p className="text-gray-600">{analytics.campaign.name} performance metrics</p>
            )}
          </div>
        </div>
        {!loading && analytics?.campaign?.status && (
          <Badge className={getStatusBadgeColor(analytics.campaign.status)}>
            {analytics.campaign.status}
          </Badge>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Loading campaign analytics...</p>
          </CardContent>
        </Card>
      ) : !analytics ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">No analytics data available.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Campaign Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.campaign.budget || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics?.campaign.spent || 0)} spent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.campaign.remaining || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.campaign.budget
                    ? `${(((analytics.campaign.remaining || 0) / analytics.campaign.budget) * 100).toFixed(1)}% remaining`
                    : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics?.totalImpressions || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total impressions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ads</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalAds || 0}</div>
                <p className="text-xs text-muted-foreground">Active ads in campaign</p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Campaign Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="text-lg font-medium">
                    {formatDate(analytics?.campaign.startDate || null)}
                  </p>
                </div>
                <div className="mx-4 h-px flex-1 bg-gray-200" />
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="text-lg font-medium">
                    {formatDate(analytics?.campaign.endDate || null)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Ads */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Ads</CardTitle>
              <CardDescription>Ads with highest impressions in this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics?.topAds || analytics.topAds.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No ad data available yet</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topAds.map((ad, index) => (
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
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusBadgeColor(ad.status)}`}
                          >
                            {ad.status}
                          </Badge>
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

          {/* Impressions Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
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
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
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
