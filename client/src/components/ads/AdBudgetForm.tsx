import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ExternalLink } from 'lucide-react';

interface AdBudgetFormProps {
  budget: number;
  ctaLink: string;
  onChange: (updates: { budget?: number; ctaLink?: string }) => void;
}

export const AdBudgetForm: React.FC<AdBudgetFormProps> = ({ budget, ctaLink, onChange }) => {
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
        <div>
          <Label htmlFor="budget">Ad Budget (USD)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              id="budget"
              type="number"
              min="0"
              step="0.01"
              value={budget || ''}
              onChange={(e) => handleBudgetChange(e.target.value)}
              placeholder="0.00"
              className="pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional: Set a specific budget for this ad. Leave empty to use campaign budget.
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
