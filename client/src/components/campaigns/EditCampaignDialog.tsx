import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CampaignDatePicker } from '@/components/common/CampaignDatePicker';
import { toast } from 'react-toastify';
import { Wallet, AlertCircle } from 'lucide-react';
import CampaignAPI, {
  UpdateCampaignPayload,
  CampaignDto,
  TeamWalletBalance,
} from '@/api/campaignApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import { editCampaignFormSchema } from '@/utils/schemas';
import { campaignStatus } from '@shared/constants';

interface EditCampaignDialogProps {
  campaign: CampaignDto | null;
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  onSuccess?: () => void;
}

type EditCampaignData = z.infer<typeof editCampaignFormSchema>;

export function EditCampaignDialog({
  campaign,
  isOpen,
  onClose,
  teamId,
  onSuccess,
}: EditCampaignDialogProps) {
  // Form setup with react-hook-form
  const form = useForm<EditCampaignData>({
    resolver: zodResolver(editCampaignFormSchema),
    defaultValues: {
      name: '',
      description: '',
      budget: 0,
      startDate: undefined,
      endDate: undefined,
      status: 'draft',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = form;
  const watchedValues = watch();

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
      reset({
        name: campaign.name,
        description: campaign.description || '',
        budget: parseFloat(campaign.budget || '0'),
        startDate: campaign.startDate ? new Date(campaign.startDate) : undefined,
        endDate: campaign.endDate ? new Date(campaign.endDate) : undefined,
        status: campaign.status || campaignStatus.draft,
      });
    }
  }, [campaign, reset]);

  const statusOptions = [
    { value: campaignStatus.draft, label: 'Draft' },
    { value: campaignStatus.active, label: 'Active' },
    { value: campaignStatus.paused, label: 'Paused' },
    { value: campaignStatus.completed, label: 'Completed' },
  ];

  const onSubmit = async (data: EditCampaignData) => {
    if (!campaign) return;

    // Check budget changes and wallet balance
    const currentBudget = parseFloat(campaign.budget || '0');
    const newBudget = data.budget;
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

    try {
      const payload: UpdateCampaignPayload = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        budget: data.budget,
        startDate: data.startDate ? data.startDate : undefined,
        endDate: data.endDate ? data.endDate : undefined,
        status: data.status as 'draft' | 'active' | 'paused' | 'completed',
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
    }
  };

  if (!campaign) return null;

  const currentBudget = parseFloat(campaign.budget || '0');
  const budgetIncrease = watchedValues.budget - currentBudget;
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Campaign Name</label>
            <Input {...register('name')} placeholder="Enter campaign name" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <Textarea {...register('description')} placeholder="Describe your campaign" rows={3} />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Budget ($)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register('budget', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.budget && <p className="mt-1 text-xs text-red-600">{errors.budget.message}</p>}
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
            <CampaignDatePicker
              date={watchedValues.startDate}
              onDateChange={(date) => setValue('startDate', date || undefined)}
              placeholder="Select start date"
              minDate={new Date()}
            />
            {errors.startDate && (
              <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">End Date</label>
            <CampaignDatePicker
              date={watchedValues.endDate}
              onDateChange={(date) => setValue('endDate', date)}
              placeholder="Select end date"
              minDate={
                watchedValues.startDate
                  ? new Date(watchedValues.startDate.getTime() + 24 * 60 * 60 * 1000)
                  : new Date()
              }
            />
            {errors.endDate && (
              <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>
            )}
          </div>

          {/* Campaign Status */}
          <div>
            <label className="mb-2 block text-sm font-medium">Campaign Status</label>
            <RadioGroup
              value={watchedValues.status}
              onValueChange={(value) =>
                setValue('status', value as 'draft' | 'active' | 'paused' | 'completed')
              }
              className="grid grid-cols-2 gap-4"
            >
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
