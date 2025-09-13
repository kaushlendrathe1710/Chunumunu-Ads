import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client with credentials from environment variables
export const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Use environment variable or fallback to hardcoded value
const bucketName = process.env.AWS_BUCKET_NAME;
const bucketRegion = process.env.AWS_BUCKET_REGION;

// Function to upload a video file to S3
export async function uploadVideoToS3(filePath: string, fileName: string): Promise<string> {
  try {
    // Validate inputs
    if (!filePath) throw new Error('File path is required');
    if (!fileName) throw new Error('File name is required');

    // Clean the filename to prevent S3 path issues
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Read the file as a stream with error handling
    let fileStream;
    try {
      fileStream = createReadStream(filePath);
    } catch (error) {
      console.error(`Failed to read file at path ${filePath}:`, error);
      throw new Error(
        `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Add error event handler to the stream
    fileStream.on('error', (error) => {
      console.error('Error in file stream:', error);
      throw new Error(`Stream error: ${error.message}`);
    });

    // Create a unique file key (path in S3) with UUID for collision prevention
    const timestamp = Date.now();
    const uuid = Math.random().toString(36).substring(2, 15);
    const key = `videos/${timestamp}-${uuid}-${sanitizedFileName}`;

    // Detect content type based on file extension
    let contentType = 'video/mp4'; // Default
    if (fileName.endsWith('.webm')) contentType = 'video/webm';
    else if (fileName.endsWith('.mov')) contentType = 'video/quicktime';
    else if (fileName.endsWith('.avi')) contentType = 'video/x-msvideo';
    else if (fileName.endsWith('.mkv')) contentType = 'video/x-matroska';

    // Configure the upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      // Add additional metadata for better organization and searchability
      Metadata: {
        'original-filename': sanitizedFileName,
        'upload-timestamp': timestamp.toString(),
      },
    };

    // Create a multipart upload with retry configuration
    const upload = new Upload({
      client: s3Client,
      params: uploadParams,
      // Add retry options for production reliability
      queueSize: 4, // Number of concurrent parts to upload
      partSize: 5 * 1024 * 1024, // 5MB part size
      leavePartsOnError: false, // Clean up partial uploads on failure
    });

    // Add event listeners for better monitoring and debugging
    upload.on('httpUploadProgress', (progress) => {
      console.log(`Upload progress: ${progress.loaded}/${progress.total} bytes`);
    });

    // Execute the upload and get the result
    const result = await upload.done();

    // Return the URL of the uploaded file
    const videoUrl =
      result.Location || `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`;
    console.log(`Successfully uploaded to S3: ${videoUrl}`);
    return videoUrl;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error(
      `Failed to upload video to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Function to get a signed URL for a video in S3
export function getS3VideoUrl(key: string): string {
  return `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`;
}

// Generate a presigned URL with a limited time to allow temporary access
// Note: This would be useful for private videos that need temporary access
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    // Return the standard S3 URL
    return `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

// Generate a presigned URL that allows direct upload from the browser
export async function generatePresignedUrlForUpload(
  fileName: string,
  contentType: string = 'video/mp4',
  userId: number = 0,
  expiresIn = 3600
): Promise<{ url: string; key: string }> {
  try {
    // Clean the filename to prevent S3 path issues
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Create a unique file key (path in S3) with UUID for collision prevention
    const timestamp = Date.now();
    const uuid = Math.random().toString(36).substring(2, 15);
    const key = `${userId}/videos/${timestamp}-${uuid}-${sanitizedFileName}`;

    // Detect content type based on file extension if not provided
    if (!contentType) {
      if (fileName.endsWith('.webm')) contentType = 'video/webm';
      else if (fileName.endsWith('.mov')) contentType = 'video/quicktime';
      else if (fileName.endsWith('.avi')) contentType = 'video/x-msvideo';
      else if (fileName.endsWith('.mkv')) contentType = 'video/x-matroska';
      else contentType = 'video/mp4'; // Default
    }

    // Create the PUT command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      // Add additional metadata for better organization and searchability
      Metadata: {
        'original-filename': sanitizedFileName,
        'upload-timestamp': timestamp.toString(),
        'upload-method': 'direct',
        'user-Id': userId.toString(),
      },
    });

    // Generate the presigned URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    // Return both the URL and the file key (needed to construct the final URL after upload)
    return {
      url: signedUrl,
      key: key,
    };
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    throw new Error(
      `Failed to generate presigned upload URL: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Function to upload an image file to S3
export async function uploadImageToS3(filePath: string, fileName: string): Promise<string> {
  try {
    // Validate inputs
    if (!filePath) throw new Error('File path is required');
    if (!fileName) throw new Error('File name is required');

    // Clean the filename to prevent S3 path issues
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Read the file as a stream with error handling
    let fileStream;
    try {
      fileStream = createReadStream(filePath);
    } catch (error) {
      console.error(`Failed to read file at path ${filePath}:`, error);
      throw new Error(
        `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Add error event handler to the stream
    fileStream.on('error', (error) => {
      console.error('Error reading file stream:', error);
      throw new Error(`File stream error: ${error.message}`);
    });

    // Create a unique file key (path in S3) with UUID for collision prevention
    const timestamp = Date.now();
    const uuid = Math.random().toString(36).substring(2, 15);
    const key = `images/${timestamp}-${uuid}-${sanitizedFileName}`;

    // Detect content type based on file extension
    let contentType = 'image/jpeg'; // Default
    if (fileName.endsWith('.png')) contentType = 'image/png';
    else if (fileName.endsWith('.gif')) contentType = 'image/gif';
    else if (fileName.endsWith('.webp')) contentType = 'image/webp';
    else if (fileName.endsWith('.svg')) contentType = 'image/svg+xml';

    // Configure the upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      Metadata: {
        'original-name': fileName,
        'upload-timestamp': timestamp.toString(),
      },
    };

    // Create a multipart upload with retry configuration
    const upload = new Upload({
      client: s3Client,
      params: uploadParams,
      tags: [], // Optional tags
      queueSize: 4, // Number of concurrent parts to upload
      partSize: 1024 * 1024 * 5, // 5 MB parts
      leavePartsOnError: false, // Clean up partial uploads on failure
    });

    // Track upload progress
    upload.on('httpUploadProgress', (progress) => {
      console.log(`Upload progress: ${progress.loaded}/${progress.total} bytes`);
    });

    // Execute the upload and get the result
    const result = await upload.done();

    // Return the URL of the uploaded file
    const imageUrl =
      result.Location || `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`;
    console.log(`Successfully uploaded image to S3: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    throw new Error(
      `Failed to upload image to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Dedicated avatar uploader for predictable key structure: <userId>/profile/<filename>
export async function uploadAvatarToS3(
  filePath: string,
  fileName: string,
  userId: number
): Promise<string> {
  try {
    if (!filePath) throw new Error('File path is required');
    if (!fileName) throw new Error('File name is required');
    if (!userId) throw new Error('User ID required for avatar path');

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${userId}/profile/${sanitizedFileName}`; // stable path (overwrites old avatar version implicitly)

    let contentType = 'image/jpeg';
    if (fileName.endsWith('.png')) contentType = 'image/png';
    else if (fileName.endsWith('.gif')) contentType = 'image/gif';
    else if (fileName.endsWith('.webp')) contentType = 'image/webp';
    else if (fileName.endsWith('.svg')) contentType = 'image/svg+xml';

    const fileStream = createReadStream(filePath);
    fileStream.on('error', (err) => {
      throw new Error(`Avatar stream error: ${err.message}`);
    });

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        Metadata: {
          'original-name': sanitizedFileName,
          'upload-timestamp': Date.now().toString(),
          purpose: 'avatar',
          userId: userId.toString(),
        },
      },
    });

    const result = await upload.done();
    return result.Location || `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`;
  } catch (e) {
    console.error('Avatar upload failed:', e);
    throw new Error('Failed to upload avatar');
  }
}

// Function to delete a file from S3 using key
export async function deleteFromS3(key: string): Promise<void> {
  try {
    // Validate input
    if (!key) throw new Error('File key is required');

    // Configure the delete parameters
    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    // Execute the delete command
    await s3Client.send(new DeleteObjectCommand(deleteParams));

    console.log(`Successfully deleted from S3: ${key}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(
      `Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Function to delete a video file from S3
export async function deleteVideoFromS3(key: string): Promise<void> {
  try {
    // Validate input
    if (!key) throw new Error('File key is required');

    // Configure the delete parameters
    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    // Execute the delete command
    await s3Client.send(new DeleteObjectCommand(deleteParams));

    console.log(`Successfully deleted from S3: ${key}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(
      `Failed to delete video from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Function to delete a file from S3
export async function deleteFileFromS3(fileUrl: string): Promise<void> {
  try {
    // Extract the key from the URL
    const urlParts = fileUrl.split('.amazonaws.com/');
    if (urlParts.length !== 2) {
      console.warn('Invalid S3 URL format:', fileUrl);
      return; // Don't throw error for invalid URLs
    }

    const key = urlParts[1];

    // Create the delete command
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    // Execute the delete command
    await s3Client.send(command);
    console.log(`Successfully deleted from S3: ${key}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    // Don't throw error to prevent delete operation from failing if S3 deletion fails
    console.warn('Failed to delete S3 file, continuing with database deletion');
  }
}

// Function to extract S3 key from URL
export function extractS3KeyFromUrl(fileUrl: string): string | null {
  try {
    const urlParts = fileUrl.split('.amazonaws.com/');
    return urlParts.length === 2 ? urlParts[1] : null;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
}
