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
import AdAPI from '@/api/adApi';
import { adSchema } from '@/utils/schemas';
import { adStatus } from '@shared/constants';
import { z } from 'zod';
import { QK } from '@/api/queryKeys';

interface CreateAdDialogProps {
  teamId: number;
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

export const CreateAdDialog: React.FC<CreateAdDialogProps> = ({ teamId, onSuccess, onCancel }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [videoFile, setVideoFile] = useState<UploadedFile | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<UploadedFile | null>(null);

  const [formData, setFormData] = useState<AdFormData>({
    title: '',
    description: '',
    categories: [],
    tags: [],
    ctaLink: '',
    budget: 0,
    campaignId: '',
    status: adStatus.draft, // Default to draft
  });

  const campaignsQuery = useQuery<CampaignDto[]>({
    queryKey: QK.campaigns(teamId),
    queryFn: () => CampaignAPI.list(teamId) as Promise<CampaignDto[]>,
    enabled: !!teamId,
    placeholderData: (prev) => prev, // keep old campaigns while refetching
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
      // Only update if actually changed (shallow compare length + ids)
      if (
        mapped.length !== campaigns.length ||
        mapped.some((m, i) => campaigns[i]?.id !== m.id || campaigns[i]?.name !== m.name)
      ) {
        setCampaigns(mapped);
        // Auto-select if only one campaign and none chosen
        if (mapped.length === 1 && !formData.campaignId) {
          setFormData((f) => ({ ...f, campaignId: String(mapped[0].id) }));
        }
      }
    }
  }, [campaignsQuery.data, campaigns.length, formData.campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!videoFile || !thumbnailFile) {
      toast.error('Upload video and thumbnail');
      return;
    }

    const parseResult = adSchema.safeParse({
      ...formData,
      videoUrl: videoFile?.finalUrl || '',
      thumbnailUrl: thumbnailFile?.finalUrl || '',
    });
    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    const payload = {
      title: formData.title,
      description: formData.description,
      categories: formData.categories,
      tags: formData.tags,
      ctaLink: formData.ctaLink,
      videoUrl: videoFile.finalUrl,
      thumbnailUrl: thumbnailFile.finalUrl,
      budget: formData.budget,
      campaignId: parseInt(formData.campaignId),
      status: formData.status,
    };
    createMutation.mutate(payload as any);
  };

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (payload: any) => AdAPI.create(teamId, payload.campaignId, payload),
    onSuccess: () => {
      toast.success('Ad created successfully');
      queryClient.invalidateQueries({ queryKey: QK.ads(teamId) });
      onSuccess();
      setSubmitting(false);
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to create ad');
      setSubmitting(false);
    },
  });

  if (campaignsQuery.isLoading && !campaigns.length) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

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
        uploadContext={
          formData.campaignId
            ? {
                teamId: teamId,
                campaignId: parseInt(formData.campaignId),
              }
            : undefined
        }
      />

      <AdBudgetForm
        budget={formData.budget}
        ctaLink={formData.ctaLink}
        campaignBudgetInfo={budgetInfoQuery.data}
        onChange={(updates: { budget?: number; ctaLink?: string }) =>
          setFormData({ ...formData, ...updates })
        }
      />

      {/* Status Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Status</CardTitle>
          <CardDescription>Set the initial status for this ad</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.status}
            onValueChange={(value: string) => setFormData({ ...formData, status: value })}
            className="space-y-2"
          >
            {Object.entries(adStatus).map(([key, value]) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value} id={value} />
                <Label htmlFor={value} className="capitalize">
                  {key.replace('_', ' ')}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Ad'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
