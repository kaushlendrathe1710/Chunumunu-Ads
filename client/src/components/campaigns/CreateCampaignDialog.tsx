import React, { useEffect } from 'react';
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
import CampaignAPI, { CreateCampaignPayload, TeamWalletBalance } from '@/api/campaignApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/api/queryKeys';
import { campaignStatus } from '@shared/constants';
import { ScrollArea } from '@/components/ui/scroll-area';

// Create a proper validation schema for campaign creation
const createCampaignFormSchema = z
  .object({
    name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name is too long'),
    description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
    budget: z
      .number({ invalid_type_error: 'Budget must be a number' })
      .min(0, 'Budget must be 0 or greater')
      .max(1_000_000, 'Budget is too large'),
    startDate: z
      .date({
        required_error: 'Start date is required',
        invalid_type_error: 'Please select a valid start date',
      })
      .refine((date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      }, 'Start date cannot be in the past'),
    endDate: z.date({
      required_error: 'End date is required',
      invalid_type_error: 'Please select a valid end date',
    }),
    status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

type CreateCampaignData = z.infer<typeof createCampaignFormSchema>;

interface CreateCampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  onSuccess?: () => void;
}

export function CreateCampaignDialog({
  isOpen,
  onClose,
  teamId,
  onSuccess,
}: CreateCampaignDialogProps) {
  // Form setup with react-hook-form
  const form = useForm<CreateCampaignData>({
    resolver: zodResolver(createCampaignFormSchema),
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

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        description: '',
        budget: 0,
        startDate: undefined,
        endDate: undefined,
        status: 'draft',
      });
    }
  }, [isOpen, reset]);

  const statusOptions = [
    { value: campaignStatus.draft, label: 'Draft' },
    { value: campaignStatus.active, label: 'Active' },
    { value: campaignStatus.paused, label: 'Paused' },
    { value: campaignStatus.completed, label: 'Completed' },
  ];

  const onSubmit = async (data: CreateCampaignData) => {
    // Additional wallet balance check
    if (data.budget > 0 && walletBalance) {
      const availableBalance = parseFloat(walletBalance.balance);
      if (data.budget > availableBalance) {
        toast.error(
          `Insufficient wallet balance. Available: $${availableBalance.toFixed(2)}, Required: $${data.budget.toFixed(2)}`
        );
        return;
      }
    }

    try {
      const payload: CreateCampaignPayload = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        budget: data.budget.toString(),
        startDate: data.startDate ? data.startDate : undefined,
        endDate: data.endDate ? data.endDate : undefined,
        status: data.status,
      };

      await CampaignAPI.create(teamId, payload);
      toast.success('Campaign created successfully');

      // Close dialog and reset form
      onClose();
      reset();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QK.campaigns(teamId) });
      queryClient.invalidateQueries({ queryKey: QK.teamWalletBalance(teamId) });

      // Call success callback if provided
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    }
  };

  const availableBalance = walletBalance ? parseFloat(walletBalance.balance) : 0;
  const insufficientBalance = watchedValues.budget > 0 && watchedValues.budget > availableBalance;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        {/* Wallet Balance Info */}
        {walletBalance && (
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Available Balance: ${availableBalance.toFixed(2)} {walletBalance.currency}
              </span>
            </div>
            <p className="mt-1 text-xs text-blue-700">
              Team: {walletBalance.teamName} (Owner's Wallet)
            </p>
            {insufficientBalance && (
              <div className="mt-2 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  Insufficient balance for this budget amount
                </span>
              </div>
            )}
          </div>
        )}
        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label className="mb-2 block text-sm font-medium">Campaign Name</label>
              <Input {...register('name')} placeholder="Enter campaign name" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <Textarea
                {...register('description')}
                placeholder="Describe your campaign"
                rows={3}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label className="mb-2 block text-sm font-medium">Budget ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                {...register('budget', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.budget && (
                <p className="mt-1 text-xs text-red-600">{errors.budget.message}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Budget will be deducted from your wallet when campaign becomes active
              </p>
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-2 block text-sm font-medium">Start Date</label>
              <CampaignDatePicker
                date={watchedValues.startDate}
                onDateChange={(date) => {
                  setValue('startDate', date || (undefined as any));
                  if (date) {
                    // Trigger validation for both start and end date
                    form.trigger(['startDate', 'endDate']);
                  }
                }}
                placeholder="Select start date"
                minDate={new Date()}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="mb-2 block text-sm font-medium">End Date</label>
              <CampaignDatePicker
                date={watchedValues.endDate}
                onDateChange={(date) => {
                  setValue('endDate', date || (undefined as any));
                  if (date) {
                    // Trigger validation for end date
                    form.trigger('endDate');
                  }
                }}
                placeholder="Select end date"
                minDate={
                  watchedValues.startDate
                    ? new Date(watchedValues.startDate.getTime() + 24 * 60 * 60 * 1000)
                    : new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>
              )}
            </div>

            {/* Campaign Status */}
            <div>
              <label className="mb-3 block text-sm font-medium">Campaign Status</label>
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
              {errors.status && (
                <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>
              )}
            </div>

            {/* Action Buttons */}
            {/* Form Validation Summary */}
            {Object.keys(errors).length > 0 && (
              <div className="rounded-lg bg-red-50 p-3">
                <div className="text-sm text-red-800">
                  <strong>Please fix the following errors:</strong>
                  <ul className="mt-1 list-disc pl-5">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error?.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || insufficientBalance}
              >
                {isSubmitting ? 'Creating...' : 'Create Campaign'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
