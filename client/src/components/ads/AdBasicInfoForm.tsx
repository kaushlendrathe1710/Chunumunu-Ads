import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Campaign {
  id: number;
  name: string;
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

interface AdBasicInfoFormProps {
  formData: AdFormData;
  onChange: (formData: AdFormData) => void;
  campaigns: Campaign[];
}

export const AdBasicInfoForm: React.FC<AdBasicInfoFormProps> = ({
  formData,
  onChange,
  campaigns,
}) => {
  const handleFieldChange = (field: keyof AdFormData, value: string | number) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Provide the basic details for your ad</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Ad Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter a compelling ad title"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe your ad content"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="campaign">Campaign *</Label>
          <Select
            value={formData.campaignId}
            onValueChange={(value) => handleFieldChange('campaignId', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {campaigns.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              No campaigns available. Create a campaign first.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
