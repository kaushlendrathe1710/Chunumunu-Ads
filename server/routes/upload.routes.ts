import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { videoUpload, thumbnailUpload } from '../config/multer';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// Video upload route with optional thumbnail
router.post(
  '/video',
  videoUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  UploadController.uploadVideo
);

// Standalone thumbnail upload
router.post('/thumbnail', thumbnailUpload.single('thumbnail'), UploadController.uploadThumbnail);

// Delete file route
router.delete('/file', UploadController.deleteFile);

// Get upload progress (for future chunked uploads)
router.get('/progress/:uploadId', UploadController.getUploadProgress);

// Get presigned URL for direct uploads
router.post('/presigned-url', UploadController.getPresignedUrl);

export default router;
