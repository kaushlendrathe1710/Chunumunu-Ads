import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdDto } from '@/api/adApi';
import { formatCurrency } from '@/utils';
import {
  ExternalLink,
  Play,
  User,
  Calendar,
  DollarSign,
  Eye,
  MousePointer,
  Target,
} from 'lucide-react';

interface ViewAdDialogProps {
  ad: AdDto;
  onEdit?: () => void;
  onClose: () => void;
  showEditButton?: boolean;
}

export const ViewAdDialog: React.FC<ViewAdDialogProps> = ({
  ad,
  onEdit,
  onClose,
  showEditButton = true,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{ad.title}</h2>
          <Badge className={`mt-2 ${getStatusColor(ad.status)}`}>
            {ad.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        {showEditButton && onEdit && (
          <Button onClick={onEdit} variant="outline">
            Edit Ad
          </Button>
        )}
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ad.description && (
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="mt-1 text-sm text-muted-foreground">{ad.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Campaign</Label>
              <p className="mt-1 text-sm">{ad.campaign?.name || 'Unknown Campaign'}</p>
            </div>
            {ad.creator && (
              <div>
                <Label className="text-sm font-medium">Created By</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ad.creator.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {ad.creator.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{ad.creator.username}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <div className="mt-1 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(ad.createdAt)}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <div className="mt-1 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(ad.updatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories & Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Categories & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Categories</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ad.categories.map((category, index) => (
                <Badge key={index} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {ad.tags.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ad.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Media Content
          </CardTitle>
          <CardDescription>Video and thumbnail assets for this advertisement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Section */}
          {ad.videoUrl ? (
            <div>
              <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Play className="h-4 w-4" />
                Ad Video
              </Label>
              <div className="overflow-hidden rounded-lg border bg-black">
                <video
                  src={ad.videoUrl}
                  controls
                  className="h-64 w-full object-contain md:h-80"
                  poster={ad.thumbnailUrl}
                  preload="metadata"
                >
                  <source src={ad.videoUrl} />
                  Your browser does not support the video tag.
                </video>
                <div className="border-t bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Click play to watch the advertisement video
                    </span>
                    <a
                      href={ad.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in new tab
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-muted py-8 text-center">
              <Play className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No video uploaded</p>
            </div>
          )}

          {/* Thumbnail Section */}
          {ad.thumbnailUrl ? (
            <div>
              <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Eye className="h-4 w-4" />
                Thumbnail Preview
              </Label>
              <div className="overflow-hidden rounded-lg border">
                <div className="relative">
                  <img
                    src={ad.thumbnailUrl}
                    alt="Ad thumbnail"
                    className="h-48 w-full object-cover md:h-64"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(ad.thumbnailUrl, '_blank')}
                      className="bg-white/90 text-black hover:bg-white"
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      View Full Size
                    </Button>
                  </div>
                </div>
                <div className="border-t bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Thumbnail shown to users before video plays
                    </span>
                    <a
                      href={ad.thumbnailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in new tab
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-muted py-8 text-center">
              <Eye className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No thumbnail uploaded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget & Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Budget & Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <DollarSign className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Budget</Label>
              <p className="text-sm font-medium">
                {ad.budget && parseFloat(ad.budget) > 0
                  ? formatCurrency(parseFloat(ad.budget))
                  : 'Unlimited'}
              </p>
            </div>
            <div className="text-center">
              <DollarSign className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Spent</Label>
              <p className="text-sm font-medium">{formatCurrency(parseFloat(ad.spent || '0'))}</p>
            </div>
            <div className="text-center">
              <Eye className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Impressions</Label>
              <p className="text-sm font-medium">{ad.impressions?.toLocaleString() || '0'}</p>
            </div>
            <div className="text-center">
              <MousePointer className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Clicks</Label>
              <p className="text-sm font-medium">{ad.clicks?.toLocaleString() || '0'}</p>
            </div>
          </div>

          {ad.ctaLink && (
            <>
              <Separator className="my-4" />
              <div>
                <Label className="text-sm font-medium">Call-to-Action Link</Label>
                <a
                  href={ad.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Target className="h-4 w-4" />
                  {ad.ctaLink}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    </div>
  );
};
