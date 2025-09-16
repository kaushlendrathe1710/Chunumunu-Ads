import React, { useState, useEffect } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Eye, Wallet, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { DatePicker } from '@/components/common/DatePicker';
import CampaignAPI, { CreateCampaignPayload, TeamWalletBalance } from '@/api/campaignApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import { campaignSchema } from '@/utils/schemas';
import { z } from 'zod';
import { EditCampaignDialog } from '@/components/campaigns/EditCampaignDialog';
import { CampaignDetailsDialog } from '@/components/campaigns/CampaignDetailsDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

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

interface CreateCampaignData {
  name: string;
  description: string;
  budget: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface WalletBalance {
  balance: string;
  currency: string;
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
  const [formData, setFormData] = useState<CreateCampaignData>({
    name: '',
    description: '',
    budget: 0,
    startDate: undefined,
    endDate: undefined,
  });

  const queryClient = useQueryClient();
  const campaignsQuery = useQuery<Campaign[]>({
    queryKey: currentTeam ? QK.campaigns(currentTeam.id) : ['campaigns', 'noop'],
    queryFn: async () => {
      if (!currentTeam) return [];
      const list = await CampaignAPI.list(currentTeam.id);
      return list.map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        description: c.description,
        status: c.status,
        budget: parseFloat(c.budget || '0'),
        spent: parseFloat(c.spent || '0'),
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        startDate: c.startDate,
        endDate: c.endDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        creator: c.creator,
      }));
    },
    enabled: !!currentTeam,
    placeholderData: (prev) => prev, // SWR: show old data while fetching
  });

  // Sync local campaigns state for potential future optimistic edits
  useEffect(() => {
    if (campaignsQuery.data && campaignsQuery.data !== campaigns) {
      setCampaigns(campaignsQuery.data);
    }
  }, [campaignsQuery.data, campaigns]);

  // Fetch team wallet balance (owner's wallet visible to all team members)
  const { data: teamWalletBalance } = useQuery<TeamWalletBalance>({
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
    placeholderData: (prev) => prev,
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;

    // Validate via zod
    const parseResult = campaignSchema.safeParse(formData);
    if (!parseResult.success) {
      const first = parseResult.error.errors[0];
      toast.error(first.message);
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Start and end date required');
      return;
    }

    // Check wallet balance if budget is specified
    if (formData.budget > 0 && teamWalletBalance) {
      const availableBalance = parseFloat(teamWalletBalance.balance);
      if (formData.budget > availableBalance) {
        toast.error(
          `Insufficient wallet balance. Available: $${availableBalance.toFixed(2)}, Required: $${formData.budget.toFixed(2)}`
        );
        return;
      }
    }

    try {
      const payload: CreateCampaignPayload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        budget: formData.budget,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        status: 'draft',
      };
      await CampaignAPI.create(currentTeam.id, payload);
      toast.success('Campaign created successfully');
      setCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        budget: 0,
        startDate: undefined,
        endDate: undefined,
      });
      queryClient.invalidateQueries({ queryKey: QK.campaigns(currentTeam.id) });
      queryClient.invalidateQueries({ queryKey: QK.teamWalletBalance(currentTeam.id) });
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    }
  };

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
    userRole === 'owner' || userRole === 'admin' || hasPermission('create_campaign');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-gray-600">Manage your advertising campaigns</p>
        </div>

        {canManageCampaigns && (
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>

              {/* Wallet Balance Display */}
              {teamWalletBalance && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Available Balance: ${parseFloat(teamWalletBalance.balance).toFixed(2)}{' '}
                      {teamWalletBalance.currency}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-blue-700">
                    Team: {teamWalletBalance.teamName} (Owner's Wallet)
                  </p>
                  {formData.budget > 0 &&
                    parseFloat(teamWalletBalance.balance) < formData.budget && (
                      <div className="mt-2 flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-800">
                          Insufficient balance for this budget amount
                        </span>
                      </div>
                    )}
                </div>
              )}

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Campaign Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter campaign name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your campaign"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Budget ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Budget will be deducted from your wallet when campaign becomes active
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Start Date</label>
                  <DatePicker
                    date={formData.startDate}
                    onDateChange={(date) => setFormData({ ...formData, startDate: date })}
                    placeholder="Select start date"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">End Date</label>
                  <DatePicker
                    date={formData.endDate}
                    onDateChange={(date) => setFormData({ ...formData, endDate: date })}
                    placeholder="Select end date"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      formData.budget > 0 && teamWalletBalance
                        ? parseFloat(teamWalletBalance.balance) < formData.budget
                        : false
                    }
                  >
                    Create Campaign
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

                  {canManageCampaigns && (
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
                        <DropdownMenuItem
                          onClick={() => handleEditCampaign(campaign)}
                          disabled={campaign.status === 'completed'}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteCampaign(campaign)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Campaign
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
                    <div className="flex flex-col space-y-1">
                      <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                      {campaign.creator && <span>By: {campaign.creator.username}</span>}
                    </div>
                    <span>Updated: {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Components */}
      <EditCampaignDialog
        campaign={selectedCampaign}
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
        campaign={selectedCampaign}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
      />
    </div>
  );
}
