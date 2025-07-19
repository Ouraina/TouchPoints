import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Trash2, Edit3, Check, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { photoStorageService } from '../../services/PhotoStorageService';
import type { VisitAttachment } from '../../types';

interface PhotoGalleryProps {
  photos: VisitAttachment[];
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
  initialPhotoIndex?: number;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  isOpen,
  onClose,
  onDelete,
  initialPhotoIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [isUpdatingCaption, setIsUpdatingCaption] = useState(false);

  const currentPhoto = photos[currentIndex];

  // Load high-resolution photo URL
  useEffect(() => {
    if (!currentPhoto) return;

    const loadPhoto = async () => {
      setIsLoadingPhoto(true);
      try {
        const url = await photoStorageService.getPhotoUrl(currentPhoto.storage_path);
        setCurrentPhotoUrl(url);
      } catch (error) {
        console.error('Error loading photo:', error);
        setCurrentPhotoUrl(null);
      } finally {
        setIsLoadingPhoto(false);
      }
    };

    loadPhoto();
  }, [currentPhoto]);

  // Update caption text when photo changes
  useEffect(() => {
    setCaptionText(currentPhoto?.caption || '');
    setEditingCaption(false);
  }, [currentPhoto]);

  // Navigation functions
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Download photo
  const downloadPhoto = async () => {
    if (!currentPhotoUrl || !currentPhoto) return;

    try {
      const response = await fetch(currentPhotoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = currentPhoto.file_name || 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download photo');
    }
  };

  // Update caption
  const updateCaption = async () => {
    if (!currentPhoto) return;

    setIsUpdatingCaption(true);
    try {
      const result = await photoStorageService.updateCaption(
        currentPhoto.id,
        captionText.trim()
      );

      if (result.success) {
        // Update local photo object
        const updatedPhoto = { ...currentPhoto, caption: captionText.trim() || null };
        photos[currentIndex] = updatedPhoto;
        setEditingCaption(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Caption update failed:', error);
      alert('Failed to update caption');
    } finally {
      setIsUpdatingCaption(false);
    }
  };

  // Delete current photo
  const deleteCurrentPhoto = () => {
    if (!currentPhoto || !onDelete) return;

    if (confirm('Delete this photo? This action cannot be undone.')) {
      onDelete(currentPhoto.id);
      
      // Navigate to next photo or close if this was the last one
      if (photos.length > 1) {
        if (currentIndex >= photos.length - 1) {
          setCurrentIndex(0);
        }
      } else {
        onClose();
      }
    }
  };

  if (!isOpen || !currentPhoto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-4 z-10">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium">
              Photo {currentIndex + 1} of {photos.length}
            </h2>
            {currentPhoto.created_at && (
              <div className="flex items-center text-sm text-gray-300">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(currentPhoto.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={downloadPhoto}
              className="bg-black bg-opacity-50 text-white border-white"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            {onDelete && (
              <Button
                variant="secondary"
                size="sm"
                onClick={deleteCurrentPhoto}
                className="bg-black bg-opacity-50 text-white border-red-400 hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="bg-black bg-opacity-50 text-white border-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white border-white z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white border-white z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      {/* Main photo */}
      <div className="max-w-4xl max-h-screen w-full h-full flex items-center justify-center p-8">
        {isLoadingPhoto ? (
          <div className="flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mr-4" />
            Loading photo...
          </div>
        ) : currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={currentPhoto.caption || 'Visit photo'}
            className="max-w-full max-h-full object-contain"
            onClick={onClose} // Click to close
          />
        ) : (
          <div className="text-white text-center">
            <p className="text-lg mb-2">Failed to load photo</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Caption section */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 z-10">
        <div className="max-w-2xl mx-auto">
          {editingCaption ? (
            <div className="space-y-3">
              <textarea
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                placeholder="Add a caption for this photo..."
                className="w-full px-3 py-2 bg-black bg-opacity-50 text-white border border-gray-400 rounded-md resize-none"
                rows={2}
                maxLength={200}
                disabled={isUpdatingCaption}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-300">
                  {captionText.length}/200 characters
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCaptionText(currentPhoto.caption || '');
                      setEditingCaption(false);
                    }}
                    disabled={isUpdatingCaption}
                    className="bg-black bg-opacity-50 text-white border-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={updateCaption}
                    disabled={isUpdatingCaption}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdatingCaption ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {currentPhoto.caption ? (
                  <p className="text-white text-sm">{currentPhoto.caption}</p>
                ) : (
                  <p className="text-gray-400 text-sm italic">No caption</p>
                )}
              </div>
              {onDelete && ( // Only show edit if user can delete (same permissions)
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingCaption(true)}
                  className="bg-black bg-opacity-50 text-white border-white ml-4"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};