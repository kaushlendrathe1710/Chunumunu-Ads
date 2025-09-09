import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, Image, X, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface UploadedFile {
  file: File;
  url: string;
  key: string;
  finalUrl: string;
}

interface AdVideoUploadFormProps {
  videoFile: UploadedFile | null;
  thumbnailFile: UploadedFile | null;
  onVideoUpload: (file: UploadedFile) => void;
  onThumbnailUpload: (file: UploadedFile) => void;
  onVideoRemove: () => void;
  onThumbnailRemove: () => void;
}

export const AdVideoUploadForm: React.FC<AdVideoUploadFormProps> = ({
  videoFile,
  thumbnailFile,
  onVideoUpload,
  onThumbnailUpload,
  onVideoRemove,
  onThumbnailRemove,
}) => {
  const [videoUploading, setVideoUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const getPresignedUrl = async (
    fileName: string,
    contentType: string,
    fileType: 'video' | 'thumbnail'
  ) => {
    const response = await fetch('/api/upload/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        fileName,
        contentType,
        fileType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    return response.json();
  };

  const uploadToS3 = async (
    file: File,
    presignedUrl: string,
    onProgress: (progress: number) => void
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    // Validate file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('Video file size must be less than 500MB');
      return;
    }

    setVideoUploading(true);
    setVideoProgress(0);

    try {
      // Get presigned URL
      const { presignedUrl, finalUrl, key } = await getPresignedUrl(file.name, file.type, 'video');

      // Upload to S3
      await uploadToS3(file, presignedUrl, setVideoProgress);

      // Notify parent component
      onVideoUpload({
        file,
        url: presignedUrl,
        key,
        finalUrl,
      });

      toast.success('Video uploaded successfully');
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload video');
    } finally {
      setVideoUploading(false);
      setVideoProgress(0);
    }
  };

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Thumbnail file size must be less than 10MB');
      return;
    }

    setThumbnailUploading(true);
    setThumbnailProgress(0);

    try {
      // Get presigned URL
      const { presignedUrl, finalUrl, key } = await getPresignedUrl(
        file.name,
        file.type,
        'thumbnail'
      );

      // Upload to S3
      await uploadToS3(file, presignedUrl, setThumbnailProgress);

      // Notify parent component
      onThumbnailUpload({
        file,
        url: presignedUrl,
        key,
        finalUrl,
      });

      toast.success('Thumbnail uploaded successfully');
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload thumbnail');
    } finally {
      setThumbnailUploading(false);
      setThumbnailProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Video Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="mr-2 h-5 w-5" />
            Video File *
          </CardTitle>
          <CardDescription>
            Upload your video file (MP4, WebM, MOV, AVI, MKV). Maximum size: 500MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!videoFile ? (
            <div className="space-y-3">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="video">Video File</Label>
                <Input
                  ref={videoInputRef}
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  disabled={videoUploading}
                />
              </div>
              {videoUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{videoProgress}%</span>
                  </div>
                  <Progress value={videoProgress} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border bg-green-50 p-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">{videoFile.file.name}</p>
                  <p className="text-sm text-green-700">
                    {(videoFile.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onVideoRemove();
                  if (videoInputRef.current) videoInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thumbnail Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Image className="mr-2 h-5 w-5" />
            Thumbnail *
          </CardTitle>
          <CardDescription>Upload a thumbnail for your ad. Maximum size: 10MB</CardDescription>
        </CardHeader>
        <CardContent>
          {!thumbnailFile ? (
            <div className="space-y-3">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="thumbnail">Thumbnail Image</Label>
                <Input
                  ref={thumbnailInputRef}
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  disabled={thumbnailUploading}
                />
              </div>
              {thumbnailUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{thumbnailProgress}%</span>
                  </div>
                  <Progress value={thumbnailProgress} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border bg-green-50 p-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">{thumbnailFile.file.name}</p>
                    <p className="text-sm text-green-700">
                      {(thumbnailFile.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onThumbnailRemove();
                    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {thumbnailFile.finalUrl && (
                <div className="relative h-20 w-32 overflow-hidden rounded-md border">
                  <img
                    src={thumbnailFile.finalUrl}
                    alt="Thumbnail preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
