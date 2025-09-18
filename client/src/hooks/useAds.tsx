import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AdAPI, { 
  AdDto, 
  CreateAdPayload, 
  UpdateAdPayload, 
  AdBudgetInfo,
  DeleteAdResponse 
} from '../api/adApi';
import { QK } from '../api/queryKeys';

// Query hooks
export function useTeamAds(teamId: number) {
  return useQuery({
    queryKey: QK.ads(teamId),
    queryFn: () => AdAPI.listTeamAds(teamId),
    enabled: !!teamId,
  });
}

export function useCampaignAds(teamId: number, campaignId: number) {
  return useQuery({
    queryKey: QK.campaignAds(teamId, campaignId),
    queryFn: () => AdAPI.listCampaignAds(teamId, campaignId),
    enabled: !!teamId && !!campaignId,
  });
}

export function useAd(teamId: number, campaignId: number, adId: number) {
  return useQuery({
    queryKey: QK.ad(teamId, campaignId, adId),
    queryFn: () => AdAPI.getAd(teamId, campaignId, adId),
    enabled: !!teamId && !!campaignId && !!adId,
  });
}

export function useAdBudgetInfo(teamId: number, campaignId: number, requestedBudget?: number) {
  return useQuery({
    queryKey: QK.adBudgetInfo(teamId, campaignId, requestedBudget),
    queryFn: () => AdAPI.getBudgetInfo(teamId, campaignId, requestedBudget),
    enabled: !!teamId && !!campaignId,
  });
}

// Mutation hooks
export function useCreateAd(teamId: number, campaignId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdPayload) => AdAPI.create(teamId, campaignId, payload),
    onSuccess: (newAd) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: QK.campaignAds(teamId, campaignId) });
      queryClient.invalidateQueries({ queryKey: QK.ads(teamId) });
      
      // Optionally set the new ad in cache
      queryClient.setQueryData(QK.ad(teamId, campaignId, newAd.id), newAd);
      
      toast.success('Ad created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create ad';
      toast.error(errorMessage);
      
      // If it's a budget error, provide more specific feedback
      if (error.response?.data?.budgetInfo) {
        const budgetInfo = error.response.data.budgetInfo;
        toast.error(
          `Budget insufficient: ${budgetInfo.requestedBudget} requested, only ${budgetInfo.remainingBudget} remaining`
        );
      }
    },
  });
}

export function useUpdateAd(teamId: number, campaignId: number, adId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAdPayload) => AdAPI.update(teamId, campaignId, adId, payload),
    onSuccess: (updatedAd) => {
      // Update specific ad in cache
      queryClient.setQueryData(QK.ad(teamId, campaignId, adId), updatedAd);
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: QK.campaignAds(teamId, campaignId) });
      queryClient.invalidateQueries({ queryKey: QK.ads(teamId) });
      
      toast.success('Ad updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update ad';
      toast.error(errorMessage);
      
      // If it's a budget error, provide more specific feedback
      if (error.response?.data?.budgetInfo) {
        const budgetInfo = error.response.data.budgetInfo;
        toast.error(
          `Budget insufficient: ${budgetInfo.requestedBudget} requested, only ${budgetInfo.remainingBudget} remaining`
        );
      }
    },
  });
}

export function useDeleteAd(teamId: number, campaignId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adId: number) => AdAPI.remove(teamId, campaignId, adId),
    onSuccess: (result: DeleteAdResponse, adId) => {
      // Remove ad from cache
      queryClient.removeQueries({ queryKey: QK.ad(teamId, campaignId, adId) });
      
      // Invalidate lists to refetch updated data
      queryClient.invalidateQueries({ queryKey: QK.campaignAds(teamId, campaignId) });
      queryClient.invalidateQueries({ queryKey: QK.ads(teamId) });
      
      // Show success message with refund info if applicable
      const message = result.refundAmount > 0 
        ? `Ad deleted successfully. ${result.refundAmount} refunded.`
        : 'Ad deleted successfully';
      
      toast.success(message);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete ad';
      toast.error(errorMessage);
    },
  });
}

// Utility hooks for permission-based UI logic
export function useAdPermissions() {
  // This would typically integrate with your auth/permission system
  // For now, returning basic structure
  return {
    canCreateAd: true, // Should be based on actual permissions
    canEditAd: true,
    canDeleteAd: true,
    canViewAd: true,
  };
}

// Hook to validate ad budget before creation
export function useAdBudgetValidation(teamId: number, campaignId: number) {
  return {
    validateBudget: async (requestedBudget?: number): Promise<{ isValid: boolean; error?: string }> => {
      try {
        await AdAPI.getBudgetInfo(teamId, campaignId, requestedBudget);
        return { isValid: true };
      } catch (error: any) {
        return {
          isValid: false,
          error: error.response?.data?.error || 'Budget validation failed',
        };
      }
    },
  };
}