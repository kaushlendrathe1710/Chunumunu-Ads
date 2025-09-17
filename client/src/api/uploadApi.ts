import { apiClient } from './apiClient';

export interface PresignedUrlResponse {
  presignedUrl: string;
  finalUrl: string;
  key: string;
}

export interface UploadContext {
  teamId?: number;
  campaignId?: number;
  adId?: number;
  userId?: number;
}

export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  fileType: 'video' | 'thumbnail' | 'avatar',
  context: UploadContext = {}
): Promise<PresignedUrlResponse> {
  const { data } = await apiClient.post<PresignedUrlResponse>('/upload/presigned-url', {
    fileName,
    contentType,
    fileType,
    context,
  });
  return data;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  await apiClient.delete('/upload/delete-file', {
    data: { fileUrl },
  });
}
