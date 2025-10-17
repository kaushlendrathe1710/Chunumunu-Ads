import React, { useState, useEffect } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import CampaignAPI, { CampaignDto, TeamWalletBalance } from '@/api/campaignApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import { CreateCampaignDialog } from '@/components/campaigns/CreateCampaignDialog';
import { EditCampaignDialog } from '@/components/campaigns/EditCampaignDialog';
import { CampaignDetailsDialog } from '@/components/campaigns/CampaignDetailsDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getCampaignAvailableBalance } from '@/utils';
import { campaignStatus, permission, teamRole } from '@shared/constants';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
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
}

export default function TeamCampaigns() {
  const { currentTeam, userRole, hasPermission } = useTeam();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);

  const queryClient = useQueryClient();
  const campaignsQuery = useQuery<CampaignDto[]>({
    queryKey: currentTeam ? QK.campaigns(currentTeam.id) : ['campaigns', 'noop'],
    queryFn: async () => {
      if (!currentTeam) return [];
      const list = await CampaignAPI.list(currentTeam.id);
      return list;
    },
    enabled: !!currentTeam,
    placeholderData: (prev) => prev, // SWR: show old data while fetching
  });

  // Sync local campaigns state for potential future optimistic edits
  useEffect(() => {
    if (campaignsQuery.data) {
      // Map CampaignDto to local Campaign shape
      const mapped = campaignsQuery.data.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        description: c.description,
        status: c.status,
        budget: parseFloat(c.budget || '-1'),
        spent: parseFloat(c.spent || '0'),
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        startDate: c.startDate,
        endDate: c.endDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        creator: c.creator,
      }));
      setCampaigns(mapped);
    }
  }, [campaignsQuery.data]);

  // Fetch team wallet balance (owner's wallet visible to all team members)
  const teamWalletBalanceQuery = useQuery<TeamWalletBalance | null>({
    queryKey: currentTeam ? QK.teamWalletBalance(currentTeam.id) : ['team-wallet', 'noop'],
    queryFn: async () => {
      if (!currentTeam) return null;
      try {
        return await CampaignAPI.getTeamWalletBalance(currentTeam.id);
      } catch (e) {
        console.error('Failed to fetch team wallet balance:', e);
        return null;
      }
    },
    enabled: !!currentTeam,
    staleTime: 30_000,
    placeholderData: (prev: TeamWalletBalance | null | undefined) => prev || null,
  });
  const teamWalletBalance = teamWalletBalanceQuery.data;

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditModalOpen(true);
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteModalOpen(true);
  };

  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailsModalOpen(true);
  };

  const handleDeleteCampaignConfirm = async () => {
    if (!selectedCampaign || !currentTeam) return;

    setIsDeletingCampaign(true);

    try {
      const result = await CampaignAPI.delete(currentTeam.id, selectedCampaign.id);

      toast.success(
        `Campaign deleted successfully${result.refundAmount > 0 ? `. $${result.refundAmount.toFixed(2)} refunded to wallet.` : ''}`
      );

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QK.campaigns(currentTeam.id) });
      queryClient.invalidateQueries({ queryKey: QK.teamWalletBalance(currentTeam.id) });
      queryClient.invalidateQueries({ queryKey: QK.wallet() });

      setDeleteModalOpen(false);
      setSelectedCampaign(null);
    } catch (error: any) {
      console.error('Failed to delete campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to delete campaign');
    } finally {
      setIsDeletingCampaign(false);
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
            <p className="text-gray-500">Please select a team to manage campaigns.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManageCampaigns =
    userRole === teamRole.owner || userRole === teamRole.admin || hasPermission(permission.create_campaign);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-gray-600">Manage your advertising campaigns</p>
        </div>

        {canManageCampaigns && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        )}
      </div>

      {/* Campaigns List */}
      <div className="grid gap-6">
        {campaignsQuery.isLoading && campaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500">Loading campaigns...</p>
            </CardContent>
          </Card>
        ) : !campaigns || campaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4 text-gray-500">No campaigns found.</p>
              {canManageCampaigns && (
                <p className="text-sm text-gray-400">Create your first campaign to get started.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          (campaigns || []).map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      {campaign.name}
                      <Badge className={getStatusBadgeColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </CardTitle>
                    {campaign.description && (
                      <CardDescription className="mt-2">{campaign.description}</CardDescription>
                    )}
                  </div>

                  {(canManageCampaigns || hasPermission(permission.view_campaign)) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewCampaign(campaign)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canManageCampaigns && (userRole === teamRole.owner || userRole === teamRole.admin || hasPermission(permission.edit_campaign)) && (
                          <DropdownMenuItem
                            onClick={() => handleEditCampaign(campaign)}
                            disabled={campaign.status === 'completed'}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Campaign
                          </DropdownMenuItem>
                        )}
                        {canManageCampaigns && (userRole === teamRole.owner || userRole === teamRole.admin || hasPermission(permission.delete_campaign)) && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteCampaign(campaign)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Campaign
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(campaign.budget)}
                    </p>
                    <p className="text-sm text-gray-500">Budget</p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(campaign.spent)}
                    </p>
                    <p className="text-sm text-gray-500">Spent</p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">
                      {(() => {
                        const val = getCampaignAvailableBalance(campaign.budget, campaign.spent);
                        return val === 'Unlimited' ? 'Unlimited' : formatCurrency(val as number);
                      })()}
                    </p>
                    <p className="text-sm text-gray-500">Available</p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatNumber(campaign.impressions)}
                    </p>
                    <p className="text-sm text-gray-500">Impressions</p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatNumber(campaign.clicks)}
                    </p>
                    <p className="text-sm text-gray-500">Clicks</p>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    {campaign.creator && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Created By: </span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={campaign.creator.avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {campaign.creator.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{campaign.creator.username}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Components */}
      <CreateCampaignDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        teamId={currentTeam?.id || 0}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: QK.campaigns(currentTeam!.id) });
          queryClient.invalidateQueries({ queryKey: QK.teamWalletBalance(currentTeam!.id) });
        }}
      />

      <EditCampaignDialog
        campaign={
          selectedCampaign
            ? {
                ...selectedCampaign,
                id: parseInt(selectedCampaign.id),
                budget: selectedCampaign.budget.toString(),
                spent: selectedCampaign.spent.toString(),
              }
            : null
        }
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        teamId={currentTeam?.id || 0}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: QK.campaigns(currentTeam!.id) });
          queryClient.invalidateQueries({ queryKey: QK.teamWalletBalance(currentTeam!.id) });
        }}
      />

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Campaign"
        description={`Are you sure you want to delete "${selectedCampaign?.name}"? This action cannot be undone. All ads associated with this campaign will also be deleted.`}
        confirmText="Delete Campaign"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeletingCampaign}
        onConfirm={handleDeleteCampaignConfirm}
      >
        {selectedCampaign &&
          (() => {
            const budget = parseFloat(selectedCampaign.budget?.toString() || '0');
            const spent = parseFloat(selectedCampaign.spent?.toString() || '0');
            const refundAmount = budget - spent;

            return (
              <>
                {refundAmount > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm text-green-800">
                      <strong>${refundAmount.toFixed(2)}</strong> from unused budget will be
                      refunded to the team owner's wallet.
                    </p>
                  </div>
                )}
                {budget > 0 && refundAmount <= 0 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-sm text-orange-800">
                      The entire campaign budget has been spent. No refund will be issued.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
      </ConfirmDialog>

      <CampaignDetailsDialog
        campaign={
          selectedCampaign
            ? {
                ...selectedCampaign,
                id: parseInt(selectedCampaign.id),
                budget: selectedCampaign.budget.toString(),
                spent: selectedCampaign.spent.toString(),
              }
            : null
        }
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
      />
    </div>
  );
}
