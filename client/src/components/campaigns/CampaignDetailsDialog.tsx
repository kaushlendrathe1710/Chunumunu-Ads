import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CampaignDto } from '@/api/campaignApi';
import { Calendar, DollarSign, Target, TrendingUp, Eye, Clock } from 'lucide-react';

interface CampaignDetailsDialogProps {
  campaign: CampaignDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignDetailsDialog({ campaign, isOpen, onClose }: CampaignDetailsDialogProps) {
  if (!campaign) return null;

  const budget = parseFloat(campaign.budget || '0');
  const spent = parseFloat(campaign.spent || '0');
  const remainingBudget = budget - spent;
  const spentPercentage = budget > 0 ? (spent / budget) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {campaign.name}
              <Badge className={getStatusBadgeColor(campaign.status)}>{campaign.status}</Badge>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Description */}
          {campaign.description && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Description</h3>
              <p className="text-sm text-muted-foreground">{campaign.description}</p>
            </div>
          )}

          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(budget)}</p>
                  <p className="text-sm text-gray-500">Total Budget</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(spent)}</p>
                  <p className="text-sm text-gray-500">Spent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(remainingBudget)}
                  </p>
                  <p className="text-sm text-gray-500">Remaining</p>
                </div>
              </div>

              {/* Budget Progress Bar */}
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span>Spend Progress</span>
                  <span>{spentPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${
                      spentPercentage > 90
                        ? 'bg-red-500'
                        : spentPercentage > 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(campaign.impressions || 0)}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <Eye className="h-3 w-3" />
                    Impressions
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(campaign.clicks || 0)}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <Target className="h-3 w-3" />
                    Clicks
                  </p>
                </div>
              </div>

              {/* CTR Calculation */}
              {campaign.impressions && campaign.impressions > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-lg font-bold text-indigo-600">
                    {(((campaign.clicks || 0) / campaign.impressions) * 100).toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500">Click-Through Rate</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.startDate && (
                <div className="flex items-center gap-2">
                  <span className="w-20 text-sm text-gray-500">Start:</span>
                  <span className="text-sm">{formatDate(campaign.startDate)}</span>
                </div>
              )}
              {campaign.endDate && (
                <div className="flex items-center gap-2">
                  <span className="w-20 text-sm text-gray-500">End:</span>
                  <span className="text-sm">{formatDate(campaign.endDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-20 text-sm text-gray-500">Created:</span>
                <span className="text-sm">{formatDate(campaign.createdAt)}</span>
              </div>
              {campaign.creator && (
                <div className="flex items-center gap-2">
                  <span className="w-20 text-sm text-gray-500">By:</span>
                  <span className="text-sm">{campaign.creator.username}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-20 text-sm text-gray-500">Updated:</span>
                <span className="text-sm">{formatDate(campaign.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
