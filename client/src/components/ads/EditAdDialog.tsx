import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';
import { AdBasicInfoForm } from './AdBasicInfoForm';
import { AdCategoriesForm } from './AdCategoriesForm';
import { AdVideoUploadForm } from './AdVideoUploadForm';
import { AdBudgetForm } from './AdBudgetForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CampaignAPI, { CampaignDto } from '@/api/campaignApi';
import AdAPI, { AdDto } from '@/api/adApi';
import { adSchema } from '@/utils/schemas';
import { adStatus } from '@shared/constants';
import { QK } from '@/api/queryKeys';

interface EditAdDialogProps {
  teamId: number;
  campaignId: number;
  ad: AdDto;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Campaign {
  id: number;
  name: string;
}

interface UploadedFile {
  file: File;
  url: string;
  key: string;
  finalUrl: string;
}

interface AdFormData {
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  ctaLink: string;
  budget: number;
  campaignId: string;
  status: string;
}

export const EditAdDialog: React.FC<EditAdDialogProps> = ({
  teamId,
  campaignId,
  ad,
  onSuccess,
  onCancel,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [videoFile, setVideoFile] = useState<UploadedFile | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<UploadedFile | null>(null);

  const [formData, setFormData] = useState<AdFormData>({
    title: ad.title,
    description: ad.description || '',
    categories: ad.categories,
    tags: ad.tags,
    ctaLink: ad.ctaLink || '',
    budget: parseFloat(ad.budget || '0'),
    campaignId: ad.campaignId.toString(),
    status: ad.status,
  });

  const queryClient = useQueryClient();

  const campaignsQuery = useQuery<CampaignDto[]>({
    queryKey: QK.campaigns(teamId),
    queryFn: () => CampaignAPI.list(teamId) as Promise<CampaignDto[]>,
    enabled: !!teamId,
  });

  // Fetch campaign budget info when campaign is selected
  const budgetInfoQuery = useQuery({
    queryKey: ['adBudgetInfo', teamId, formData.campaignId],
    queryFn: () => AdAPI.getBudgetInfo(teamId, formData.campaignId, formData.budget || undefined),
    enabled: !!formData.campaignId && !!teamId,
    staleTime: 30000, // 30 seconds
  });

  useEffect(() => {
    if (campaignsQuery.data) {
      const mapped = campaignsQuery.data.map((c) => ({ id: c.id, name: c.name }));
      setCampaigns(mapped);
    }
  }, [campaignsQuery.data]);

  const updateAdMutation = useMutation({
    mutationFn: (payload: any) => AdAPI.update(teamId, campaignId, ad.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.campaigns(teamId) });
      queryClient.invalidateQueries({ queryKey: QK.ads(teamId) });
      queryClient.invalidateQueries({ queryKey: ['campaignAds', teamId, campaignId] });
      toast.success('Ad updated successfully!');
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Update ad error:', error);
      toast.error(error.response?.data?.error || 'Failed to update ad');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use existing URLs if no new files uploaded
    const finalVideoUrl = videoFile?.finalUrl || ad.videoUrl;
    const finalThumbnailUrl = thumbnailFile?.finalUrl || ad.thumbnailUrl;

    const parseResult = adSchema.safeParse({
      ...formData,
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbnailUrl,
    });

    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      const updatePayload = {
        title: formData.title,
        description: formData.description,
        categories: formData.categories,
        tags: formData.tags,
        ctaLink: formData.ctaLink,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        budget: formData.budget,
        status: formData.status as any,
      };

      await updateAdMutation.mutateAsync(updatePayload);
    } catch (error) {
      console.error('Edit ad error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = [
    { value: adStatus.draft, label: 'Draft' },
    { value: adStatus.active, label: 'Active' },
    { value: adStatus.paused, label: 'Paused' },
    { value: adStatus.completed, label: 'Completed' },
    { value: adStatus.under_review, label: 'Under Review' },
    { value: adStatus.rejected, label: 'Rejected' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <AdBasicInfoForm formData={formData} onChange={setFormData} campaigns={campaigns} />

      <AdCategoriesForm
        categories={formData.categories}
        tags={formData.tags}
        onCategoriesChange={(categories: string[]) => setFormData({ ...formData, categories })}
        onTagsChange={(tags: string[]) => setFormData({ ...formData, tags })}
      />

      <AdVideoUploadForm
        videoFile={videoFile}
        thumbnailFile={thumbnailFile}
        onVideoUpload={setVideoFile}
        onThumbnailUpload={setThumbnailFile}
        onVideoRemove={() => setVideoFile(null)}
        onThumbnailRemove={() => setThumbnailFile(null)}
        existingVideoUrl={ad.videoUrl}
        existingThumbnailUrl={ad.thumbnailUrl}
        uploadContext={{
          teamId: teamId,
          campaignId: campaignId,
          adId: ad.id,
        }}
      />

      <AdBudgetForm
        budget={formData.budget}
        ctaLink={formData.ctaLink}
        campaignBudgetInfo={budgetInfoQuery.data}
        originalBudget={parseFloat(ad.budget || '0')}
        onChange={(updates: { budget?: number; ctaLink?: string }) =>
          setFormData({ ...formData, ...updates })
        }
      />

      {/* Status Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Status</CardTitle>
          <CardDescription>Set the current status of this ad</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
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
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? 'Updating...' : 'Update Ad'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
