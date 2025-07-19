import { supabase } from '../supabase';

export interface VoiceNoteUpload {
  visitId: string;
  audioBlob: Blob;
  duration: number;
  mimeType?: string;
}

export interface VoiceNoteRecord {
  id: string;
  visitId: string;
  fileName: string;
  fileSize: number;
  duration: number;
  mimeType: string;
  storageUrl: string;
  createdAt: string;
}

export class VoiceNoteService {
  private static readonly STORAGE_BUCKET = 'visit-attachments';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Compress audio blob to reduce file size
   */
  private static async compressAudio(audioBlob: Blob): Promise<Blob> {
    try {
      // Create an audio context for processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create offline context with reduced sample rate for compression
      const sampleRate = Math.min(audioBuffer.sampleRate, 22050); // Reduce sample rate
      const offlineContext = new OfflineAudioContext(
        1, // Mono channel
        audioBuffer.duration * sampleRate,
        sampleRate
      );
      
      // Create buffer source
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      // Render compressed audio
      await offlineContext.startRendering();
      
      // Convert back to blob (simplified approach - in production you'd use a proper encoder)
      // For now, we'll just return the original blob with a size check
      if (audioBlob.size <= this.MAX_FILE_SIZE) {
        return audioBlob;
      }
      
      // If too large, we'd need a more sophisticated compression
      // For now, just return original and let Supabase handle it
      return audioBlob;
      
    } catch (error) {
      console.warn('Audio compression failed, using original:', error);
      return audioBlob;
    }
  }

  /**
   * Generate unique filename for voice note
   */
  private static generateFileName(visitId: string, mimeType: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = mimeType.includes('webm') ? 'webm' : 
                     mimeType.includes('mp4') ? 'm4a' : 
                     mimeType.includes('wav') ? 'wav' : 'audio';
    
    return `voice-notes/${visitId}/${timestamp}.${extension}`;
  }

  /**
   * Upload voice note to Supabase Storage
   */
  static async uploadVoiceNote({
    visitId,
    audioBlob,
    duration,
    mimeType = audioBlob.type
  }: VoiceNoteUpload): Promise<VoiceNoteRecord> {
    try {
      // Validate file size
      if (audioBlob.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size (${Math.round(audioBlob.size / 1024 / 1024)}MB) exceeds maximum (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // Compress audio if needed
      const compressedBlob = await this.compressAudio(audioBlob);
      
      // Generate filename
      const fileName = this.generateFileName(visitId, mimeType);
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, compressedBlob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      // Create database record
      const voiceNoteRecord = {
        id: crypto.randomUUID(),
        visit_id: visitId,
        file_name: fileName,
        file_size: compressedBlob.size,
        duration: Math.round(duration),
        mime_type: mimeType,
        storage_url: urlData.publicUrl,
        created_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('visit_attachments')
        .insert({
          ...voiceNoteRecord,
          attachment_type: 'voice_note'
        });

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([fileName]);
        
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      // Update visit to indicate it has voice note
      await supabase
        .from('visits')
        .update({ has_voice_note: true })
        .eq('id', visitId);

      return {
        id: voiceNoteRecord.id,
        visitId: voiceNoteRecord.visit_id,
        fileName: voiceNoteRecord.file_name,
        fileSize: voiceNoteRecord.file_size,
        duration: voiceNoteRecord.duration,
        mimeType: voiceNoteRecord.mime_type,
        storageUrl: voiceNoteRecord.storage_url,
        createdAt: voiceNoteRecord.created_at
      };

    } catch (error) {
      console.error('Voice note upload failed:', error);
      throw error;
    }
  }

  /**
   * Get voice notes for a visit
   */
  static async getVoiceNotesForVisit(visitId: string): Promise<VoiceNoteRecord[]> {
    try {
      const { data, error } = await supabase
        .from('visit_attachments')
        .select('*')
        .eq('visit_id', visitId)
        .eq('attachment_type', 'voice_note')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch voice notes: ${error.message}`);
      }

      return (data || []).map(record => ({
        id: record.id,
        visitId: record.visit_id,
        fileName: record.file_name,
        fileSize: record.file_size,
        duration: record.duration,
        mimeType: record.mime_type,
        storageUrl: record.storage_url,
        createdAt: record.created_at
      }));

    } catch (error) {
      console.error('Failed to fetch voice notes:', error);
      throw error;
    }
  }

  /**
   * Delete a voice note
   */
  static async deleteVoiceNote(voiceNoteId: string): Promise<void> {
    try {
      // Get the voice note record first
      const { data: voiceNote, error: fetchError } = await supabase
        .from('visit_attachments')
        .select('*')
        .eq('id', voiceNoteId)
        .single();

      if (fetchError || !voiceNote) {
        throw new Error(`Voice note not found: ${fetchError?.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove([voiceNote.file_name]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('visit_attachments')
        .delete()
        .eq('id', voiceNoteId);

      if (dbError) {
        throw new Error(`Failed to delete from database: ${dbError.message}`);
      }

      // Check if visit still has voice notes
      const { data: remainingNotes } = await supabase
        .from('visit_attachments')
        .select('id')
        .eq('visit_id', voiceNote.visit_id)
        .eq('attachment_type', 'voice_note');

      if (!remainingNotes || remainingNotes.length === 0) {
        // Update visit to indicate no voice note
        await supabase
          .from('visits')
          .update({ has_voice_note: false })
          .eq('id', voiceNote.visit_id);
      }

    } catch (error) {
      console.error('Failed to delete voice note:', error);
      throw error;
    }
  }

  /**
   * Get total storage used by voice notes for a user
   */
  static async getStorageUsage(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('visit_attachments')
        .select('file_size, visits!inner(circles!inner(*))')
        .eq('attachment_type', 'voice_note')
        .eq('visits.circles.creator_id', userId);

      if (error) {
        throw new Error(`Failed to get storage usage: ${error.message}`);
      }

      return (data || []).reduce((total, record) => total + (record.file_size || 0), 0);

    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return 0;
    }
  }
}