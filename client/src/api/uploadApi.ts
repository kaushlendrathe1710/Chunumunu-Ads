import { apiClient } from './apiClient';

export interface PresignedUrlResponse {
  presignedUrl: string;
  finalUrl: string;
  key: string;
}

export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  fileType: 'video' | 'thumbnail'
): Promise<PresignedUrlResponse> {
  const { data } = await apiClient.post<PresignedUrlResponse>('/upload/presigned-url', {
    fileName,
    contentType,
    fileType,
  });
  return data;
}
