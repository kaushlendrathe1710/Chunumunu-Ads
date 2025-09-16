import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/common/DatePicker';
import { toast } from 'react-toastify';
import { Wallet, AlertCircle } from 'lucide-react';
import CampaignAPI, {
  UpdateCampaignPayload,
  CampaignDto,
  TeamWalletBalance,
} from '@/api/campaignApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import { campaignSchema } from '@/utils/schemas';

interface EditCampaignDialogProps {
  campaign: CampaignDto | null;
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  onSuccess?: () => void;
}

interface EditCampaignData {
  name: string;
  description: string;
  budget: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export function EditCampaignDialog({
  campaign,
  isOpen,
  onClose,
  teamId,
  onSuccess,
}: EditCampaignDialogProps) {
  const [formData, setFormData] = useState<EditCampaignData>({
    name: '',
    description: '',
    budget: 0,
    startDate: undefined,
    endDate: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch team wallet balance
  const { data: walletBalance } = useQuery<TeamWalletBalance>({
    queryKey: QK.teamWalletBalance(teamId),
    queryFn: () => CampaignAPI.getTeamWalletBalance(teamId),
    enabled: isOpen && !!teamId,
    staleTime: 30_000,
  });

  // Initialize form data when campaign changes
  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        budget: parseFloat(campaign.budget || '0'),
        startDate: campaign.startDate ? new Date(campaign.startDate) : undefined,
        endDate: campaign.endDate ? new Date(campaign.endDate) : undefined,
      });
    }

    return () =>{
      setFormData({
        name: '',
        description: '',
        budget: 0,
        startDate: undefined,
        endDate: undefined,
      });
    }
  }, [campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setIsSubmitting(true);

    try {
      // Validate form data
      const parseResult = campaignSchema.safeParse(formData);
      if (!parseResult.success) {
        const first = parseResult.error.errors[0];
        toast.error(first.message);
        return;
      }

      // Check budget changes and wallet balance
      const currentBudget = parseFloat(campaign.budget || '0');
      const newBudget = formData.budget;
      const budgetIncrease = newBudget - currentBudget;

      if (budgetIncrease > 0 && walletBalance) {
        const availableBalance = parseFloat(walletBalance.balance);
        if (budgetIncrease > availableBalance) {
          toast.error(
            `Insufficient wallet balance for budget increase. Available: $${availableBalance.toFixed(2)}, Required: $${budgetIncrease.toFixed(2)}`
          );
          return;
        }
      }

      const payload: UpdateCampaignPayload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        budget: formData.budget,
        startDate: formData.startDate?.toISOString(),
        endDate: formData.endDate?.toISOString(),
      };

      await CampaignAPI.update(teamId, campaign.id, payload);

      toast.success('Campaign updated successfully');

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QK.campaigns(teamId) });
      queryClient.invalidateQueries({ queryKey: QK.campaign(teamId, campaign.id) });
      queryClient.invalidateQueries({ queryKey: QK.teamWalletBalance(teamId) });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to update campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to update campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!campaign) return null;

  const currentBudget = parseFloat(campaign.budget || '0');
  const budgetIncrease = formData.budget - currentBudget;
  const availableBalance = walletBalance ? parseFloat(walletBalance.balance) : 0;
  const insufficientBalance = budgetIncrease > 0 && budgetIncrease > availableBalance;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
        </DialogHeader>

        {/* Wallet Balance Display */}
        {walletBalance && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Available Balance: ${availableBalance.toFixed(2)} {walletBalance.currency}
              </span>
            </div>
            {budgetIncrease > 0 && (
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-sm text-blue-800">
                  Budget increase: ${budgetIncrease.toFixed(2)}
                </span>
              </div>
            )}
            {insufficientBalance && (
              <div className="mt-2 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  Insufficient balance for budget increase
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            {budgetIncrease > 0 && (
              <p className="mt-1 text-xs text-blue-600">
                Additional ${budgetIncrease.toFixed(2)} will be deducted from wallet
              </p>
            )}
            {budgetIncrease < 0 && (
              <p className="mt-1 text-xs text-green-600">
                ${Math.abs(budgetIncrease).toFixed(2)} will be refunded to wallet
              </p>
            )}
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
            <Button type="submit" className="flex-1" disabled={isSubmitting || insufficientBalance}>
              {isSubmitting ? 'Updating...' : 'Update Campaign'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
