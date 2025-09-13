import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import {
  uploadVideoToS3,
  uploadImageToS3,
  deleteFromS3,
  generatePresignedUrlForUpload,
} from '../config/s3';
import { AuthenticatedRequest } from '../types';

// Validation schemas
const uploadVideoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([]),
  ctaLink: z.string().url().optional(),
});

export class UploadController {
  static async uploadVideo(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = uploadVideoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.video || !files.video[0]) {
        return res.status(400).json({ error: 'Video file is required' });
      }

      const videoFile = files.video[0];
      const thumbnailFile = files.thumbnail ? files.thumbnail[0] : null;

      try {
        // Upload video to S3
        const videoUrl = await uploadVideoToS3(videoFile.path, videoFile.filename);

        let thumbnailUrl: string | undefined;
        if (thumbnailFile) {
          // Upload thumbnail to S3
          thumbnailUrl = await uploadImageToS3(thumbnailFile.path, thumbnailFile.filename);
        }

        // Clean up local files
        await fs.unlink(videoFile.path);
        if (thumbnailFile) {
          await fs.unlink(thumbnailFile.path);
        }

        res.status(201).json({
          message: 'Video uploaded successfully',
          data: {
            videoUrl,
            thumbnailUrl,
            metadata: {
              title: validation.data.title,
              description: validation.data.description,
              category: validation.data.category,
              tags: validation.data.tags,
              ctaLink: validation.data.ctaLink,
              originalName: videoFile.originalname,
              size: videoFile.size,
              mimetype: videoFile.mimetype,
            },
          },
        });
      } catch (uploadError) {
        // Clean up local files on error
        try {
          await fs.unlink(videoFile.path);
          if (thumbnailFile) {
            await fs.unlink(thumbnailFile.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up files:', cleanupError);
        }

        throw uploadError;
      }
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async uploadThumbnail(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Thumbnail file is required' });
      }

      try {
        // Upload thumbnail to S3
        const thumbnailUrl = await uploadImageToS3(file.path, file.filename);

        // Clean up local file
        await fs.unlink(file.path);

        res.status(201).json({
          message: 'Thumbnail uploaded successfully',
          data: {
            thumbnailUrl,
            metadata: {
              originalName: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
            },
          },
        });
      } catch (uploadError) {
        // Clean up local file on error
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }

        throw uploadError;
      }
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      res.status(500).json({
        error: 'Failed to upload thumbnail',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileUrl } = req.body;

      if (!fileUrl || typeof fileUrl !== 'string') {
        return res.status(400).json({ error: 'File URL is required' });
      }

      // Extract the key from the S3 URL
      const urlParts = fileUrl.split('/');
      const key = urlParts.slice(-2).join('/'); // Get the last two parts (folder/filename)

      await deleteFromS3(key);

      res.json({
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getUploadProgress(req: AuthenticatedRequest, res: Response) {
    try {
      // This would be used for chunked uploads or progress tracking
      // For now, we'll return a simple response
      const { uploadId } = req.params;

      res.json({
        uploadId,
        status: 'completed',
        progress: 100,
      });
    } catch (error) {
      console.error('Get upload progress error:', error);
      res.status(500).json({ error: 'Failed to get upload progress' });
    }
  }

  static async getPresignedUrl(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileName, contentType, fileType } = req.body;

      if (!fileName || !fileType) {
        return res.status(400).json({
          error: 'fileName and fileType are required',
        });
      }

      if (!['video', 'thumbnail'].includes(fileType)) {
        return res.status(400).json({
          error: 'fileType must be either "video" or "thumbnail"',
        });
      }

      const userId = req.user!.id;

      // Generate presigned URL
      const { url, key } = await generatePresignedUrlForUpload(
        fileName,
        contentType,
        userId,
        3600 // 1 hour expiry
      );

      // Construct the final URL that will be accessible after upload
      const finalUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${key}`;

      res.json({
        presignedUrl: url,
        finalUrl,
        key,
        expiresIn: 3600,
      });
    } catch (error) {
      console.error('Get presigned URL error:', error);
      res.status(500).json({
        error: 'Failed to generate presigned URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
