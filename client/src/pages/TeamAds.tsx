import React, { useState, useEffect } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Plus, MoreVertical, Eye, Trash2, Filter, Edit, User } from 'lucide-react';
import { toast } from 'react-toastify';
import { CreateAdDialog, EditAdDialog, ViewAdDialog } from '@/components/ads';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdAPI, { AdDto } from '@/api/adApi';
import CampaignAPI from '@/api/campaignApi';
import { QK } from '@/api/queryKeys';

type Ad = AdDto & { campaignName?: string };

export default function TeamAds() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const [ads, setAds] = useState<Ad[]>([]); // local for derived addition of campaignName if needed
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<{ id: number; name: string }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [viewingAd, setViewingAd] = useState<Ad | null>(null);
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery<AdDto[] | any[]>({
    queryKey: currentTeam ? QK.campaigns(currentTeam.id) : ['campaigns', 'noop'],
    queryFn: () => (currentTeam ? CampaignAPI.list(currentTeam.id) : Promise.resolve([])),
    enabled: !!currentTeam,
  });

  const adsQuery = useQuery<AdDto[]>({
    queryKey: currentTeam ? QK.ads(currentTeam.id, selectedCampaign) : ['ads', 'noop'],
    queryFn: async () => {
      if (!currentTeam) return [] as AdDto[];
      if (selectedCampaign === 'all') return AdAPI.listTeamAds(currentTeam.id);
      return AdAPI.listCampaignAds(currentTeam.id, selectedCampaign);
    },
    enabled: !!currentTeam,
  });

  // Update campaigns when data is available
  useEffect(() => {
    if (campaignsQuery.data && campaigns.length === 0) {
      setCampaigns((campaignsQuery.data as any[]).map((c: any) => ({ id: c.id, name: c.name })));
    }
  }, [campaignsQuery.data, campaigns.length]);

  // Update ads when data is available
  useEffect(() => {
    if (adsQuery.data && adsQuery.data !== ads) {
      setAds(adsQuery.data as any);
    }
  }, [adsQuery.data, ads]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ ad, status }: { ad: Ad; status: string }) =>
      AdAPI.update(currentTeam!.id, ad.campaignId, ad.id, { status: status as any }),
    onSuccess: () => {
      toast.success('Ad status updated');
      if (currentTeam) queryClient.invalidateQueries({ queryKey: QK.ads(currentTeam.id) });
    },
    onError: () => toast.error('Failed to update ad'),
  });

  const handleStatusChange = (ad: Ad, newStatus: string) => {
    if (!currentTeam) return;
    updateStatusMutation.mutate({ ad, status: newStatus });
  };

  const deleteMutation = useMutation({
    mutationFn: () => AdAPI.remove(currentTeam!.id, deleteTarget!.campaignId, deleteTarget!.id),
    onSuccess: () => {
      toast.success('Ad deleted');
      setDeleteTarget(null);
      if (currentTeam) queryClient.invalidateQueries({ queryKey: QK.ads(currentTeam.id) });
    },
    onError: () => toast.error('Failed to delete ad'),
  });

  const handleDeleteAd = () => {
    if (!currentTeam || !deleteTarget) return;
    deleteMutation.mutate();
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Ads</h1>
          <p className="text-gray-600">Manage your advertising content</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                      // React Query invalidation handled inside dialog component
                    }}
                    onCancel={() => setCreateModalOpen(false)}
                  />
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Ads List */}
      <div className="grid gap-6">
        {adsQuery.isLoading ? (
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
                        <span>Campaign: {ad.campaign?.name}</span>
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
                        <DropdownMenuItem onClick={() => setEditingAd(ad)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Ad
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setViewingAd(ad)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteTarget(ad)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                        {formatCurrency(Number(ad.budget))}
                      </p>
                      <p className="text-sm text-gray-500">Budget</p>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(Number(ad.spent || 0))}
                    </p>
                    <p className="text-sm text-gray-500">Spent</p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">
                      {formatNumber(Number(ad.impressions || 0))}
                    </p>
                    <p className="text-sm text-gray-500">Impressions</p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-600">
                      {formatNumber(Number(ad.clicks || 0))}
                    </p>
                    <p className="text-sm text-gray-500">Clicks</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    {ad.creator && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Created By: </span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={ad.creator.avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {ad.creator.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{ad.creator.username}</span>
                      </div>
                    )}
                    <div className='flex flex-col gap-1'>
                      <span>Created: {new Date(ad.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(ad.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {/* Delete Ad Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ad</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete ad "{deleteTarget?.title}"? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAd}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ad Dialog */}
      <Dialog open={!!editingAd} onOpenChange={(o) => !o && setEditingAd(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ad</DialogTitle>
          </DialogHeader>
          {editingAd && (
            <EditAdDialog
              teamId={currentTeam!.id}
              campaignId={editingAd.campaignId}
              ad={editingAd}
              onSuccess={() => setEditingAd(null)}
              onCancel={() => setEditingAd(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Ad Dialog */}
      <Dialog open={!!viewingAd} onOpenChange={(o) => !o && setViewingAd(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ad Details</DialogTitle>
          </DialogHeader>
          {viewingAd && (
            <ViewAdDialog
              ad={viewingAd}
              onEdit={() => {
                setViewingAd(null);
                setEditingAd(viewingAd);
              }}
              onClose={() => setViewingAd(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
