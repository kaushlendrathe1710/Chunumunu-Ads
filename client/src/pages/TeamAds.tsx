import React, { useState, useEffect } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreVertical, Play, Pause, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { CreateAdDialog } from '@/components/ads';

interface Ad {
  id: string;
  title: string;
  description?: string;
  categories: string[];
  tags: string[];
  ctaLink?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'rejected' | 'under_review';
  budget?: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  campaignId: string;
  campaignName: string;
  createdAt: string;
  updatedAt: string;
}

export default function TeamAds() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      fetchAds();
    }
  }, [currentTeam]);

  const fetchAds = async () => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/ads`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAds(data.ads || []);
      } else {
        console.error('Failed to fetch ads:', response.status);
        setAds([]);
      }
    } catch (error) {
      console.error('Failed to fetch ads:', error);
      toast.error('Failed to load ads');
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (adId: string, newStatus: string) => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/ads/${adId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Ad status updated');
        fetchAds();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update ad');
      }
    } catch (error) {
      console.error('Failed to update ad:', error);
      toast.error('Failed to update ad');
    }
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
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (!currentTeam) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Please select a team to manage ads.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManageAds = userRole === 'owner' || userRole === 'admin' || hasPermission('create_ad');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Ads</h1>
          <p className="text-gray-600">Manage your advertising content</p>
        </div>

        {canManageAds && (
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Ad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Ad</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-120px)]">
                <CreateAdDialog
                  teamId={currentTeam.id}
                  onSuccess={() => {
                    setCreateModalOpen(false);
                    fetchAds();
                  }}
                  onCancel={() => setCreateModalOpen(false)}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Ads List */}
      <div className="grid gap-6">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500">Loading ads...</p>
            </CardContent>
          </Card>
        ) : !ads || ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4 text-gray-500">No ads found.</p>
              {canManageAds && (
                <p className="text-sm text-gray-400">Create your first ad to get started.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          ads.map((ad) => (
            <Card key={ad.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3">
                      {ad.title}
                      <Badge className={getStatusBadgeColor(ad.status)}>{ad.status}</Badge>
                    </CardTitle>
                    {ad.description && (
                      <CardDescription className="mt-2">{ad.description}</CardDescription>
                    )}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Campaign: {ad.campaignName}</span>
                      </div>
                    </div>
                  </div>

                  {ad.thumbnailUrl && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={ad.thumbnailUrl}
                        alt={ad.title}
                        className="h-16 w-24 rounded-md object-cover"
                      />
                    </div>
                  )}

                  {canManageAds && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ad.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(ad.id, 'active')}>
                            <Play className="mr-2 h-4 w-4" />
                            Activate Ad
                          </DropdownMenuItem>
                        )}
                        {ad.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(ad.id, 'paused')}>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause Ad
                          </DropdownMenuItem>
                        )}
                        {ad.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(ad.id, 'active')}>
                            <Play className="mr-2 h-4 w-4" />
                            Resume Ad
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Categories and Tags */}
                <div className="mb-4 space-y-2">
                  {ad.categories.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Categories: </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ad.categories.map((category, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {ad.tags.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Tags: </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ad.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {ad.budget && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(ad.budget)}
                      </p>
                      <p className="text-sm text-gray-500">Budget</p>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-xl font-bold text-red-600">{formatCurrency(ad.spent)}</p>
                    <p className="text-sm text-gray-500">Spent</p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">
                      {formatNumber(ad.impressions)}
                    </p>
                    <p className="text-sm text-gray-500">Impressions</p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-600">{formatNumber(ad.clicks)}</p>
                    <p className="text-sm text-gray-500">Clicks</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Created: {new Date(ad.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(ad.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
