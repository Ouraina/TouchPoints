import React, { useState, useEffect, useRef } from 'react';
import { Heart, Smile, Meh, Frown, AlertTriangle, Save, Clock, Camera, Mic, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PhotoCapture } from './PhotoCapture';
import { PhotoGallery } from './PhotoGallery';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { photoStorageService } from '../../services/PhotoStorageService';
import { VoiceNoteService } from '../../lib/services/VoiceNoteService';
import type { Visit, VisitAttachment } from '../../types';
import type { CompressionResult } from '../../utils/imageCompression';
import type { VoiceNoteRecord } from '../../lib/services/VoiceNoteService';

interface EnhancedVisitNotesProps {
  visit: Visit;
  onUpdate?: (visit: Partial<Visit>) => void;
  readonly?: boolean;
  className?: string;
  circleId?: string;
}

const MOOD_OPTIONS = [
  { 
    value: 'great' as const, 
    label: 'Great visit', 
    icon: Heart, 
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Wonderful time together'
  },
  { 
    value: 'good' as const, 
    label: 'Good visit', 
    icon: Smile, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Pleasant and positive'
  },
  { 
    value: 'okay' as const, 
    label: 'Okay visit', 
    icon: Meh, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    description: 'Ordinary day'
  },
  { 
    value: 'difficult' as const, 
    label: 'Difficult visit', 
    icon: Frown, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Challenging but manageable'
  },
  { 
    value: 'concerning' as const, 
    label: 'Concerning', 
    icon: AlertTriangle, 
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    description: 'May need medical attention'
  }
];

export const EnhancedVisitNotes: React.FC<EnhancedVisitNotesProps> = ({
  visit,
  onUpdate,
  readonly = false,
  className = '',
  circleId
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState(visit.notes || '');
  const [mood, setMood] = useState<typeof visit.mood>(visit.mood);
  const [moodContext, setMoodContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Photo state
  const [photos, setPhotos] = useState<VisitAttachment[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<number>(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Voice note state
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteRecord[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isLoadingVoiceNotes, setIsLoadingVoiceNotes] = useState(false);
  const [isUploadingVoiceNote, setIsUploadingVoiceNote] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Load photos and voice notes when component mounts or visit changes
  useEffect(() => {
    loadPhotos();
    loadVoiceNotes();
  }, [visit.id]);

  // Track changes
  useEffect(() => {
    const hasNotesChanged = notes !== (visit.notes || '');
    const hasMoodChanged = mood !== visit.mood;
    setHasChanges(hasNotesChanged || hasMoodChanged);
  }, [notes, mood, visit.notes, visit.mood]);

  // Auto-save functionality
  useEffect(() => {
    if (!hasChanges || readonly) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, mood, hasChanges, readonly]);

  // Photo management functions
  const loadPhotos = async () => {
    setIsLoadingPhotos(true);
    try {
      const visitPhotos = await photoStorageService.getVisitPhotos(visit.id);
      setPhotos(visitPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handlePhotoCapture = async (compressionResult: CompressionResult) => {
    if (!user || !circleId) {
      alert('Unable to upload photo. Please try again.');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoUploadProgress(0);
    setShowPhotoCapture(false);

    try {
      const result = await photoStorageService.uploadPhoto(
        compressionResult,
        {
          visitId: visit.id,
          circleId,
          uploaderId: user.id,
          caption: '',
          isPrivate: false
        },
        (progress) => {
          setPhotoUploadProgress(progress.progress);
        }
      );

      if (result.success && result.attachment) {
        setPhotos(prev => [...prev, result.attachment!]);
        setPhotoUploadProgress(100);
        
        // Clear progress after a moment
        setTimeout(() => {
          setPhotoUploadProgress(0);
          setIsUploadingPhoto(false);
        }, 1000);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo. Please try again.');
      setIsUploadingPhoto(false);
      setPhotoUploadProgress(0);
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    try {
      const result = await photoStorageService.deletePhoto(photoId);
      if (result.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Photo delete error:', error);
      alert('Failed to delete photo. Please try again.');
    }
  };

  // Voice note management functions
  const loadVoiceNotes = async () => {
    setIsLoadingVoiceNotes(true);
    try {
      const visitVoiceNotes = await VoiceNoteService.getVoiceNotesForVisit(visit.id);
      setVoiceNotes(visitVoiceNotes);
    } catch (error) {
      console.error('Error loading voice notes:', error);
    } finally {
      setIsLoadingVoiceNotes(false);
    }
  };

  const handleVoiceNoteCapture = async (audioBlob: Blob, duration: number) => {
    if (!user || !circleId) {
      alert('Unable to upload voice note. Please try again.');
      return;
    }

    setIsUploadingVoiceNote(true);
    setShowVoiceRecorder(false);

    try {
      const voiceNote = await VoiceNoteService.uploadVoiceNote({
        visitId: visit.id,
        audioBlob,
        duration,
        mimeType: audioBlob.type
      });

      setVoiceNotes(prev => [...prev, voiceNote]);
      
      // Update visit to show it has voice note
      onUpdate?.({ has_voice_note: true });
      
    } catch (error) {
      console.error('Voice note upload error:', error);
      alert('Failed to upload voice note. Please try again.');
    } finally {
      setIsUploadingVoiceNote(false);
    }
  };

  const handleVoiceNoteDelete = async (voiceNoteId: string) => {
    try {
      await VoiceNoteService.deleteVoiceNote(voiceNoteId);
      setVoiceNotes(prev => prev.filter(vn => vn.id !== voiceNoteId));
      
      // Check if there are any remaining voice notes
      const remainingNotes = voiceNotes.filter(vn => vn.id !== voiceNoteId);
      if (remainingNotes.length === 0) {
        onUpdate?.({ has_voice_note: false });
      }
    } catch (error) {
      console.error('Voice note delete error:', error);
      alert('Failed to delete voice note. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!user || !hasChanges || readonly) return;

    setIsSaving(true);

    try {
      const updates: Partial<Visit> = {};
      
      if (notes !== (visit.notes || '')) {
        updates.notes = notes;
      }

      // If mood changed, update it using the database function
      if (mood !== visit.mood && mood) {
        await supabase.rpc('update_visit_mood', {
          visit_uuid: visit.id,
          new_mood: mood,
          recorder_uuid: user.id,
          mood_context: moodContext.trim() || null
        });
        updates.mood = mood;
        updates.mood_updated_at = new Date().toISOString();
      }

      // Update visit notes if changed
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('visits')
          .update(updates)
          .eq('id', visit.id);

        if (error) throw error;

        setLastSaved(new Date());
        setHasChanges(false);
        onUpdate?.(updates);
      }
    } catch (error) {
      console.error('Error saving visit notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoodSelect = (selectedMood: typeof mood) => {
    setMood(selectedMood);
    
    // Focus on context input if concerning mood is selected
    if (selectedMood === 'concerning') {
      setTimeout(() => {
        const contextInput = document.getElementById('mood-context-input');
        contextInput?.focus();
      }, 100);
    }
  };

  const handleManualSave = () => {
    handleSave();
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    adjustTextareaHeight(e.target);
  };

  useEffect(() => {
    if (notesRef.current) {
      adjustTextareaHeight(notesRef.current);
    }
  }, [notes]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Mood Selector */}
      {!readonly && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              How was this visit?
            </h3>
            {visit.mood && visit.mood_updated_at && (
              <span className="text-xs text-gray-500">
                Last updated {new Date(visit.mood_updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MOOD_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = mood === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleMoodSelect(option.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-200 text-center
                    ${isSelected 
                      ? `${option.bgColor} ${option.color} border-current` 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }
                  `}
                  title={option.description}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs font-medium">{option.label.split(' ')[0]}</div>
                </button>
              );
            })}
          </div>

          {/* Mood Context (especially for concerning mood) */}
          {mood && (mood === 'concerning' || mood === 'difficult') && (
            <div className="mt-3">
              <label 
                htmlFor="mood-context-input" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {mood === 'concerning' ? 'What was concerning?' : 'What made it difficult?'}
              </label>
              <input
                id="mood-context-input"
                type="text"
                value={moodContext}
                onChange={(e) => setMoodContext(e.target.value)}
                placeholder={mood === 'concerning' 
                  ? "e.g., seemed confused, difficulty breathing, increased pain" 
                  : "e.g., tired, emotional, not very responsive"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                This helps family and medical staff understand the situation
              </p>
            </div>
          )}
        </div>
      )}

      {/* Display mood if readonly */}
      {readonly && visit.mood && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          {(() => {
            const moodOption = MOOD_OPTIONS.find(opt => opt.value === visit.mood);
            if (!moodOption) return null;
            
            const Icon = moodOption.icon;
            return (
              <>
                <Icon className={`w-5 h-5 ${moodOption.color}`} />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {moodOption.label}
                  </span>
                  {visit.mood_updated_at && (
                    <span className="text-xs text-gray-500 ml-2">
                      • {new Date(visit.mood_updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Visit Notes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="visit-notes" className="block text-sm font-medium text-gray-900">
            Visit notes
          </label>
          {!readonly && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isSaving && (
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 animate-spin rounded-full border border-gray-300 border-t-blue-600" />
                  Saving...
                </span>
              )}
              {lastSaved && !isSaving && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {hasChanges && !isSaving && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleManualSave}
                  className="text-xs py-1 px-2 h-auto"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save now
                </Button>
              )}
            </div>
          )}
        </div>
        
        <textarea
          ref={notesRef}
          id="visit-notes"
          value={notes}
          onChange={handleNotesChange}
          disabled={readonly}
          placeholder={readonly 
            ? "No notes recorded for this visit"
            : "How was the visit? Any observations, conversations, or memories to share? (Optional)"
          }
          className={`
            w-full px-3 py-3 border border-gray-300 rounded-md text-sm resize-none
            focus:ring-blue-500 focus:border-blue-500 min-h-[80px]
            ${readonly ? 'bg-gray-50 text-gray-700' : 'bg-white'}
          `}
          maxLength={2000}
        />
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {notes.length}/2000 characters
            {notes.length > 1800 && (
              <span className="text-orange-600 ml-2">
                ({2000 - notes.length} remaining)
              </span>
            )}
          </span>
          
          {!readonly && (
            <span>
              Auto-saves as you type
            </span>
          )}
        </div>
      </div>

      {/* Photos Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Photos from this visit
          </h3>
          {!readonly && photos.length < 5 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowPhotoCapture(true)}
              disabled={isUploadingPhoto}
              className="text-xs"
            >
              <Camera className="w-3 h-3 mr-1" />
              Add Photo
            </Button>
          )}
        </div>

        {/* Upload Progress */}
        {isUploadingPhoto && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm text-blue-800 mb-2">
              <span>Uploading photo...</span>
              <span>{photoUploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${photoUploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {isLoadingPhotos ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mr-2" />
            Loading photos...
          </div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                onView={() => setShowPhotoGallery(true)}
                onDelete={readonly ? undefined : () => handlePhotoDelete(photo.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos yet</p>
            {!readonly && (
              <p className="text-xs mt-1">
                Capture memories from this visit
              </p>
            )}
          </div>
        )}

        {/* Photo count info */}
        {photos.length > 0 && (
          <div className="text-xs text-gray-500 text-center">
            {photos.length} of 5 photos • 
            {photos.length < 5 && !readonly ? ' Add more memories' : ' Storage limit reached'}
          </div>
        )}
      </div>

      {/* Voice Notes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Voice notes from this visit
          </h3>
          {!readonly && voiceNotes.length < 3 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={isUploadingVoiceNote}
              className="text-xs"
            >
              <Mic className="w-3 h-3 mr-1" />
              Record Note
            </Button>
          )}
        </div>

        {/* Upload Status */}
        {isUploadingVoiceNote && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-center text-sm text-blue-800">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
              <span>Uploading voice note...</span>
            </div>
          </div>
        )}

        {/* Voice Notes List */}
        {isLoadingVoiceNotes ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mr-2" />
            Loading voice notes...
          </div>
        ) : voiceNotes.length > 0 ? (
          <div className="space-y-3">
            {voiceNotes.map((voiceNote) => (
              <div key={voiceNote.id} className="relative">
                <VoiceNotePlayer
                  audioUrl={voiceNote.storageUrl}
                  duration={voiceNote.duration}
                  fileName={`voice-note-${new Date(voiceNote.createdAt).toLocaleDateString()}.${voiceNote.mimeType.split('/')[1]}`}
                  onError={(error) => console.error('Voice note playback error:', error)}
                />
                
                {/* Delete button */}
                {!readonly && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (confirm('Delete this voice note? This action cannot be undone.')) {
                        handleVoiceNoteDelete(voiceNote.id);
                      }
                    }}
                    className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity p-1 w-6 h-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
                
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Recorded {new Date(voiceNote.createdAt).toLocaleDateString()} at {new Date(voiceNote.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No voice notes yet</p>
            {!readonly && (
              <p className="text-xs mt-1">
                Record your thoughts about this visit
              </p>
            )}
          </div>
        )}

        {/* Voice note count info */}
        {voiceNotes.length > 0 && (
          <div className="text-xs text-gray-500 text-center">
            {voiceNotes.length} of 3 voice notes • 
            {voiceNotes.length < 3 && !readonly ? ' Share more thoughts' : ' Storage limit reached'}
          </div>
        )}
      </div>

      {/* Privacy note */}
      {!readonly && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="flex items-start gap-2">
            <span>ℹ️</span>
            <span>
              Visit notes, mood tracking, photos, and voice notes are shared with all family members in this care circle. 
              This helps everyone stay informed about your loved one's well-being.
            </span>
          </p>
        </div>
      )}

      {/* Photo Capture Modal */}
      <Modal
        isOpen={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        title="Add Photo"
      >
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          onCancel={() => setShowPhotoCapture(false)}
          maxPhotos={5 - photos.length}
        />
      </Modal>

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <PhotoGallery
          photos={photos}
          isOpen={showPhotoGallery}
          onClose={() => setShowPhotoGallery(false)}
          onDelete={readonly ? undefined : handlePhotoDelete}
        />
      )}

      {/* Voice Recorder Modal */}
      <Modal
        isOpen={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        title="Record Voice Note"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Record up to 2 minutes to share your thoughts about this visit.
          </p>
          <VoiceRecorder
            onRecordingComplete={handleVoiceNoteCapture}
            onRecordingCancel={() => setShowVoiceRecorder(false)}
            maxDuration={120}
          />
        </div>
      </Modal>
    </div>
  );
};

// Photo Thumbnail Component
interface PhotoThumbnailProps {
  photo: VisitAttachment;
  onView: () => void;
  onDelete?: () => void;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({ photo, onView, onDelete }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        const url = await photoStorageService.getThumbnailUrl(photo);
        setThumbnailUrl(url);
      } catch (error) {
        console.error('Error loading thumbnail:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThumbnail();
  }, [photo]);

  return (
    <div className="relative group">
      <div 
        className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onView}
      >
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
          </div>
        ) : thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={photo.caption || 'Visit photo'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Camera className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Delete button */}
      {onDelete && (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this photo? This action cannot be undone.')) {
              onDelete();
            }
          }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 w-6 h-6"
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      {/* Caption */}
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {photo.caption}
        </div>
      )}
    </div>
  );
};