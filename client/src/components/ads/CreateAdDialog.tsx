import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { AdBasicInfoForm } from './AdBasicInfoForm';
import { AdCategoriesForm } from './AdCategoriesForm';
import { AdVideoUploadForm } from './AdVideoUploadForm';
import { AdBudgetForm } from './AdBudgetForm';

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
}

export const CreateAdDialog: React.FC<CreateAdDialogProps> = ({ teamId, onSuccess, onCancel }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
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
  });

  useEffect(() => {
    fetchCampaigns();
  }, [teamId]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/campaigns`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        console.error('Failed to fetch campaigns');
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (formData.categories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    if (!videoFile) {
      toast.error('Please upload a video');
      return;
    }

    if (!thumbnailFile) {
      toast.error('Please upload a thumbnail');
      return;
    }

    if (!formData.campaignId) {
      toast.error('Please select a campaign');
      return;
    }

    setSubmitting(true);

    try {
      const adData = {
        title: formData.title,
        description: formData.description,
        categories: formData.categories,
        tags: formData.tags,
        ctaLink: formData.ctaLink,
        videoUrl: videoFile.finalUrl,
        thumbnailUrl: thumbnailFile.finalUrl,
        budget: formData.budget,
        campaignId: parseInt(formData.campaignId),
      };

      const response = await fetch(`/api/teams/${teamId}/campaigns/${formData.campaignId}/ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(adData),
      });

      if (response.ok) {
        toast.success('Ad created successfully');
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create ad');
      }
    } catch (error) {
      console.error('Failed to create ad:', error);
      toast.error('Failed to create ad');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
      />

      <AdBudgetForm
        budget={formData.budget}
        ctaLink={formData.ctaLink}
        onChange={(updates: { budget?: number; ctaLink?: string }) =>
          setFormData({ ...formData, ...updates })
        }
      />

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
