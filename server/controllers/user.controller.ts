import type { Request, Response } from 'express';
import { userService } from '../db/services';
import { InsertUser } from '@shared/types/index';
import { uploadVideoToS3, deleteFileFromS3 } from '../config/s3';
import { validateUsername } from '../utils/validation';
import fs from 'fs';

export class UserController {
  // Update user profile
  static async updateProfile(req: Request, res: Response) {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Only allow users to update their own profile
    const currentUserId = (req as any).user.id || (req.session.userId as number);
    if (!currentUserId || userId !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { username, avatar } = req.body;

    // Simple validation
    if (username && (username.length < 3 || username.length > 50)) {
      return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
    }

    // Don't allow undefined values
    const updates: Partial<InsertUser> = {};
    if (username) updates.username = username;
    if (avatar !== undefined) updates.avatar = avatar;

    try {
      const updatedUser = await userService.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  // Update user profile (enhanced version)
  static async updateUserProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { username, bio } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Validation
      if (username && (username.length < 3 || username.length > 50)) {
        return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
      }

      if (username && !validateUsername(username)) {
        return res.status(400).json({
          message: 'Username can only contain letters, numbers, and underscores',
        });
      }

      if (bio && bio.length > 500) {
        return res.status(400).json({ message: 'Bio cannot exceed 500 characters' });
      }

      // Get current user data for potential cleanup
      const currentUser = await userService.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check username uniqueness if username is being updated
      if (username && username !== currentUser.username) {
        const existingUser = await userService.getUserByUsername(username);

        if (existingUser) {
          return res.status(400).json({
            message: 'Username already exists. Please choose a different username.',
          });
        }
      }

      const updates: Partial<InsertUser> = {};
      if (username && username !== currentUser.username) updates.username = username;
      if (bio !== undefined) updates.bio = bio;

      // Handle avatar upload
      let avatarUrl = currentUser.avatar; // Retain existing avatar by default
      if (files?.avatar && files.avatar[0]) {
        const { filename, path: filePath, originalname, mimetype } = files.avatar[0];

        if (!mimetype.startsWith('image/')) {
          fs.unlinkSync(filePath); // Clean up the file if not an image
          return res.status(400).json({
            message: 'Avatar must be an image file',
          });
        }

        try {
          // Upload file to S3 using the existing uploadVideoToS3 function
          const newAvatarUrl = await uploadVideoToS3(filePath, originalname);

          // Log successful upload for monitoring
          console.log(`Avatar uploaded successfully by user ${userId}: ${originalname}`);

          // Delete old avatar from S3 if it exists and is different from new one
          if (currentUser.avatar && currentUser.avatar !== newAvatarUrl) {
            try {
              await deleteFileFromS3(currentUser.avatar);
              console.log(`Old avatar deleted from S3: ${currentUser.avatar}`);
            } catch (deleteError) {
              console.warn('Failed to delete old avatar from S3:', deleteError);
            }
          }

          avatarUrl = newAvatarUrl;
        } catch (uploadError) {
          console.error('Error uploading avatar to S3:', uploadError);
          return res.status(500).json({
            message: 'Failed to upload avatar',
          });
        } finally {
          // Clean up local file
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.warn('Failed to clean up local avatar file:', err);
          }
        }
      }

      // Only add the avatar URL to updates if it changed or was uploaded
      if (avatarUrl !== currentUser.avatar) {
        updates.avatar = avatarUrl;
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length === 0) {
        return res.status(200).json({
          message: 'No changes detected',
          user: currentUser,
        });
      }

      const updatedUser = await userService.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  // Get user profile
  static async getUserProfile(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({
        user,
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      return res.status(500).json({ message: 'Failed to get user profile' });
    }
  }
}
