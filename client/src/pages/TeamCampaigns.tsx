import React, { useState, useEffect } from 'react';
import { useTeam } from '@/contexts/TeamContext';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Play, Pause, Eye, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { DatePicker } from '@/components/common/DatePicker';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
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
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCampaignData>({
    name: '',
    description: '',
    budget: 0,
    startDate: undefined,
    endDate: undefined,
  });

  useEffect(() => {
    if (currentTeam) {
      fetchCampaigns();
      fetchWalletBalance();
    }
  }, [currentTeam]);

  const fetchCampaigns = async () => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/campaigns`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        console.error('Failed to fetch campaigns:', response.status);
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data);
      } else {
        console.error('Failed to fetch wallet balance:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields including dates');
      return;
    }

    // Check wallet balance if budget is specified
    if (formData.budget > 0 && walletBalance) {
      const availableBalance = parseFloat(walletBalance.balance);
      if (formData.budget > availableBalance) {
        toast.error(
          `Insufficient wallet balance. Available: $${availableBalance.toFixed(2)}, Required: $${formData.budget.toFixed(2)}`
        );
        return;
      }
    }

    try {
      const campaignData = {
        ...formData,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      };

      const response = await fetch(`/api/teams/${currentTeam.id}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        toast.success('Campaign created successfully');
        setCreateModalOpen(false);
        setFormData({
          name: '',
          description: '',
          budget: 0,
          startDate: undefined,
          endDate: undefined,
        });
        fetchCampaigns();
        fetchWalletBalance(); // Refresh wallet balance
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    if (!currentTeam) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Campaign status updated');
        fetchCampaigns();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update campaign');
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
      toast.error('Failed to update campaign');
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
              {walletBalance && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Available Balance: ${parseFloat(walletBalance.balance).toFixed(2)}{' '}
                      {walletBalance.currency}
                    </span>
                  </div>
                  {formData.budget > 0 && parseFloat(walletBalance.balance) < formData.budget && (
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
                      formData.budget > 0 && walletBalance
                        ? parseFloat(walletBalance.balance) < formData.budget
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
        {loading ? (
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
                        {campaign.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(campaign.id, 'active')}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start Campaign
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(campaign.id, 'paused')}
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause Campaign
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'paused' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(campaign.id, 'active')}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Resume Campaign
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
                    <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(campaign.updatedAt).toLocaleDateString()}</span>
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
