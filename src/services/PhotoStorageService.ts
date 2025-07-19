import { supabase } from '../lib/supabase';
import type { VisitAttachment } from '../types';
import type { CompressionResult } from '../utils/imageCompression';

export interface PhotoUploadOptions {
  visitId: string;
  circleId: string;
  uploaderId: string;
  caption?: string;
  isPrivate?: boolean;
}

export interface PhotoUploadResult {
  success: boolean;
  attachment?: VisitAttachment;
  error?: string;
  progress?: number;
}

export interface PhotoUploadProgress {
  uploadId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class PhotoStorageService {
  private readonly BUCKET_NAME = 'visit-photos';
  private uploadProgressCallbacks = new Map<string, (progress: PhotoUploadProgress) => void>();

  /**
   * Upload a photo with compression result to Supabase Storage
   */
  async uploadPhoto(
    compressionResult: CompressionResult,
    options: PhotoUploadOptions,
    onProgress?: (progress: PhotoUploadProgress) => void
  ): Promise<PhotoUploadResult> {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (onProgress) {
      this.uploadProgressCallbacks.set(uploadId, onProgress);
    }

    try {
      this.notifyProgress(uploadId, { uploadId, progress: 0, status: 'uploading' });

      // Generate file paths
      const timestamp = Date.now();
      const mainPhotoPath = `${options.circleId}/${options.visitId}/${timestamp}_photo.jpg`;
      const thumbnailPath = compressionResult.thumbnail 
        ? `${options.circleId}/${options.visitId}/${timestamp}_thumb.jpg`
        : undefined;

      // Upload main photo
      this.notifyProgress(uploadId, { uploadId, progress: 25, status: 'uploading' });
      
      const { data: mainUpload, error: mainError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(mainPhotoPath, compressionResult.compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (mainError) {
        throw new Error(`Failed to upload photo: ${mainError.message}`);
      }

      this.notifyProgress(uploadId, { uploadId, progress: 50, status: 'uploading' });

      // Upload thumbnail if available
      let thumbnailUpload = null;
      if (compressionResult.thumbnail && thumbnailPath) {
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(thumbnailPath, compressionResult.thumbnail, {
            cacheControl: '3600',
            upsert: false
          });

        if (thumbError) {
          console.warn('Thumbnail upload failed:', thumbError);
          // Don't fail the entire upload for thumbnail issues
        } else {
          thumbnailUpload = thumbData;
        }
      }

      this.notifyProgress(uploadId, { uploadId, progress: 75, status: 'processing' });

      // Create database record
      const attachmentData = {
        visit_id: options.visitId,
        uploader_id: options.uploaderId,
        file_name: compressionResult.compressedFile.name,
        file_type: 'photo',
        file_size: compressionResult.compressedSize,
        mime_type: compressionResult.compressedFile.type,
        storage_path: mainPhotoPath,
        thumbnail_path: thumbnailUpload?.path || null,
        caption: options.caption || null,
        width: compressionResult.width,
        height: compressionResult.height,
        compression_quality: 80, // From compression options
        upload_status: 'completed',
        original_file_size: compressionResult.originalSize,
        compressed_file_size: compressionResult.compressedSize,
        is_private: options.isPrivate || false,
        is_archived: false
      };

      const { data: attachment, error: dbError } = await supabase
        .from('visit_attachments')
        .insert(attachmentData)
        .select(`
          *,
          uploader:uploader_id(full_name)
        `)
        .single();

      if (dbError) {
        // Cleanup uploaded files if database insert fails
        await this.cleanupUploadedFiles([mainPhotoPath, thumbnailPath].filter(Boolean));
        throw new Error(`Database error: ${dbError.message}`);
      }

      this.notifyProgress(uploadId, { uploadId, progress: 100, status: 'completed' });

      return {
        success: true,
        attachment: attachment as VisitAttachment
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      
      this.notifyProgress(uploadId, { 
        uploadId, 
        progress: 0, 
        status: 'failed', 
        error: errorMessage 
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      // Cleanup progress callback
      this.uploadProgressCallbacks.delete(uploadId);
    }
  }

  /**
   * Get photos for a visit
   */
  async getVisitPhotos(visitId: string): Promise<VisitAttachment[]> {
    const { data, error } = await supabase
      .from('visit_attachments')
      .select(`
        *,
        uploader:uploader_id(full_name)
      `)
      .eq('visit_id', visitId)
      .eq('file_type', 'photo')
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching visit photos:', error);
      return [];
    }

    return data as VisitAttachment[];
  }

  /**
   * Get signed URL for a photo
   */
  async getPhotoUrl(storagePath: string, expiresIn: number = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  }

  /**
   * Get thumbnail URL for quick loading
   */
  async getThumbnailUrl(attachment: VisitAttachment): Promise<string | null> {
    const path = attachment.thumbnail_path || attachment.storage_path;
    return this.getPhotoUrl(path);
  }

  /**
   * Delete a photo
   */
  async deletePhoto(attachmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get attachment details first
      const { data: attachment, error: fetchError } = await supabase
        .from('visit_attachments')
        .select('storage_path, thumbnail_path')
        .eq('id', attachmentId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch attachment: ${fetchError.message}`);
      }

      // Delete from storage
      const filesToDelete = [attachment.storage_path, attachment.thumbnail_path].filter(Boolean);
      
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filesToDelete);

        if (storageError) {
          console.warn('Storage deletion warning:', storageError);
          // Don't fail the entire operation if storage cleanup fails
        }
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('visit_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown deletion error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Archive a photo instead of deleting
   */
  async archivePhoto(attachmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('visit_attachments')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', attachmentId);

      if (error) {
        throw new Error(`Failed to archive photo: ${error.message}`);
      }

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown archive error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update photo caption
   */
  async updateCaption(
    attachmentId: string, 
    caption: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('visit_attachments')
        .update({ 
          caption: caption.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', attachmentId);

      if (error) {
        throw new Error(`Failed to update caption: ${error.message}`);
      }

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown update error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(circleId: string): Promise<{
    totalPhotos: number;
    totalSize: number;
    storageUsed: string;
  }> {
    const { data, error } = await supabase
      .from('visit_attachments')
      .select('compressed_file_size')
      .eq('file_type', 'photo')
      .eq('is_archived', false)
      .like('storage_path', `${circleId}/%`);

    if (error) {
      console.error('Error fetching storage stats:', error);
      return { totalPhotos: 0, totalSize: 0, storageUsed: '0 MB' };
    }

    const totalPhotos = data.length;
    const totalSize = data.reduce((sum, item) => sum + (item.compressed_file_size || 0), 0);
    const storageUsed = this.formatFileSize(totalSize);

    return { totalPhotos, totalSize, storageUsed };
  }

  /**
   * Private helper methods
   */
  private notifyProgress(uploadId: string, progress: PhotoUploadProgress): void {
    const callback = this.uploadProgressCallbacks.get(uploadId);
    if (callback) {
      callback(progress);
    }
  }

  private async cleanupUploadedFiles(paths: string[]): Promise<void> {
    try {
      await supabase.storage.from(this.BUCKET_NAME).remove(paths);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

// Export singleton instance
export const photoStorageService = new PhotoStorageService();