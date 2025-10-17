import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ExternalLink, Info } from 'lucide-react';

interface CampaignBudgetInfo {
  campaignBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
}

interface AdBudgetFormProps {
  budget: number;
  ctaLink: string;
  campaignBudgetInfo?: CampaignBudgetInfo | null;
  originalBudget: number;
  onChange: (updates: { budget?: number; ctaLink?: string }) => void;
}

export const AdBudgetForm: React.FC<AdBudgetFormProps> = ({
  budget,
  ctaLink,
  campaignBudgetInfo,
  originalBudget,
  onChange,
}) => {
  const handleBudgetChange = (value: string) => {
    const numericValue = parseFloat(value) || 0;
    onChange({ budget: numericValue });
  };

  const handleCtaLinkChange = (value: string) => {
    onChange({ ctaLink: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget & Call-to-Action</CardTitle>
        <CardDescription>Set your ad budget and call-to-action link</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign Budget Info */}
        {campaignBudgetInfo && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Campaign Budget</span>
            </div>
            <div className="space-y-1 text-xs text-blue-700">
              <div className="flex justify-between">
                <span>Total Campaign Budget:</span>
                <span className="font-medium">${campaignBudgetInfo.campaignBudget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Allocated:</span>
                <span className="font-medium">
                  ${campaignBudgetInfo.allocatedBudget.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-blue-300 pt-1">
                <span>Available:</span>
                <span className="font-semibold text-blue-800">
                  ${campaignBudgetInfo.remainingBudget.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="budget">Ad Budget (USD)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              id="budget"
              type="number"
              min="0"
              step="0.01"
              max={
                campaignBudgetInfo
                  ? (originalBudget || 0) + campaignBudgetInfo.remainingBudget
                  : undefined
              }
              value={budget || ''}
              onChange={(e) => handleBudgetChange(e.target.value)}
              placeholder="0.00"
              className="pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {campaignBudgetInfo &&
              `You can increase up to $${((originalBudget || 0) + campaignBudgetInfo.remainingBudget).toFixed(2)} total.`}
          </p>
        </div>

        <div>
          <Label htmlFor="ctaLink">Call-to-Action Link</Label>
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              id="ctaLink"
              type="url"
              value={ctaLink}
              onChange={(e) => handleCtaLinkChange(e.target.value)}
              placeholder="https://your-website.com"
              className="pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional: Where users should go when they click your ad
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
