import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import AnalyticsAPI, { AdAnalyticsDto } from '@/api/analyticsApi';
import { permission, teamRole } from '@shared/constants';
import {
  BarChart3,
  TrendingUp,
  Eye,
  DollarSign,
  ArrowLeft,
  Activity,
  Target,
  Smartphone,
  Monitor,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdAnalytics() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const [, setLocation] = useLocation();
  const params = useParams<{ campaignId: string; adId: string }>();
  const campaignId = params.campaignId ? parseInt(params.campaignId) : null;
  const adId = params.adId ? parseInt(params.adId) : null;

  const { data: analytics, isLoading: loading } = useQuery({
    queryKey:
      currentTeam && campaignId && adId
        ? QK.adAnalytics(currentTeam.id, campaignId, adId)
        : ['ad', 'analytics', 'noop'],
    queryFn: () =>
      currentTeam && campaignId && adId
        ? AnalyticsAPI.getAdAnalytics(currentTeam.id, campaignId, adId)
        : Promise.resolve(undefined),
    enabled: !!currentTeam && !!campaignId && !!adId,
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
      case 'under_review':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Please select a team to view ad analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaignId || !adId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Invalid ad or campaign ID.</p>
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
          <Button variant="ghost" size="sm" onClick={() => setLocation('/team/ads')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Ads
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ad Analytics</h1>
            {!loading && analytics?.ad && (
              <p className="text-gray-600">{analytics.ad.title} performance metrics</p>
            )}
          </div>
        </div>
        {!loading && analytics?.ad?.status && (
          <Badge className={getStatusBadgeColor(analytics.ad.status)}>{analytics.ad.status}</Badge>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Loading ad analytics...</p>
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
          {/* Ad Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Details</CardTitle>
              <CardDescription>{analytics?.ad.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Campaign</p>
                  <p className="text-lg font-medium">{analytics?.ad.campaignName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Campaign Budget</p>
                  <p className="text-lg font-medium">
                    {formatCurrency(analytics?.ad.campaignBudget || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.ad.budget && analytics.ad.budget > 0
                    ? formatCurrency(analytics.ad.budget)
                    : 'Unlimited'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics?.ad.spent || 0)} spent
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
                  {analytics?.ad.budget && analytics.ad.budget > 0
                    ? formatCurrency(analytics.ad.remaining || 0)
                    : 'Unlimited'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.ad.budget && analytics.ad.budget > 0
                    ? `${(((analytics.ad.remaining || 0) / analytics.ad.budget) * 100).toFixed(1)}% remaining`
                    : 'No budget limit'}
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
                <p className="text-xs text-muted-foreground">All-time impressions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Cost</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalImpressions && analytics.totalImpressions > 0
                    ? formatCurrency((analytics.ad.spent || 0) / analytics.totalImpressions)
                    : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">Cost per impression</p>
              </CardContent>
            </Card>
          </div>

          {/* Impressions by Action & Device */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Impressions by Action */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Impressions by Action
                </CardTitle>
                <CardDescription>Breakdown of user actions</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics?.impressionsByAction || analytics.impressionsByAction.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">No action data available yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.impressionsByAction.map((item, index) => (
                      <div key={item.action} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium capitalize">
                            {item.action.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatNumber(item.count)}</div>
                          <div className="text-xs text-gray-500">
                            {analytics.totalImpressions
                              ? `${((item.count / analytics.totalImpressions) * 100).toFixed(1)}%`
                              : '0%'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Impressions by Device */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Impressions by Device
                </CardTitle>
                <CardDescription>Device type breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics?.impressionsByDevice || analytics.impressionsByDevice.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">No device data available yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.impressionsByDevice.map((item, index) => (
                      <div key={item.deviceType} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.deviceType.toLowerCase().includes('mobile') ? (
                            <Smartphone className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Monitor className="h-4 w-4 text-purple-500" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {item.deviceType || 'Unknown'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatNumber(item.count)}</div>
                          <div className="text-xs text-gray-500">
                            {analytics.totalImpressions
                              ? `${((item.count / analytics.totalImpressions) * 100).toFixed(1)}%`
                              : '0%'}
                          </div>
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
                      Data will appear once this ad starts receiving impressions
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
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4 }}
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
