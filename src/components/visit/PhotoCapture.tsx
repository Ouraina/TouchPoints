import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RotateCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { compressImage, validateImageFile, createPreviewUrl, cleanupPreviewUrl } from '../../utils/imageCompression';
import type { CompressionResult } from '../../utils/imageCompression';

interface PhotoCaptureProps {
  onPhotoCapture: (result: CompressionResult) => void;
  onCancel: () => void;
  maxPhotos?: number;
  disabled?: boolean;
}

interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  isActive: boolean;
  facingMode: 'user' | 'environment';
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoCapture,
  onCancel,
  maxPhotos = 5,
  disabled = false
}) => {
  const [captureMode, setCaptureMode] = useState<'choose' | 'camera' | 'file'>('choose');
  const [camera, setCamera] = useState<CameraState>({
    stream: null,
    error: null,
    isActive: false,
    facingMode: 'environment'
  });
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check camera availability
  const isCameraSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    if (!isCameraSupported()) {
      setCamera(prev => ({
        ...prev,
        error: 'Camera not supported on this device'
      }));
      return;
    }

    try {
      setCamera(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: camera.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCamera(prev => ({
        ...prev,
        stream,
        isActive: true
      }));
    } catch (error) {
      console.error('Camera error:', error);
      setCamera(prev => ({
        ...prev,
        error: 'Unable to access camera. Please check permissions or try file upload.',
        isActive: false
      }));
    }
  }, [camera.facingMode, isCameraSupported]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (camera.stream) {
      camera.stream.getTracks().forEach(track => track.stop());
    }
    setCamera(prev => ({
      ...prev,
      stream: null,
      isActive: false
    }));
  }, [camera.stream]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      setCapturedFile(file);
      setPreviewUrl(createPreviewUrl(file));
      stopCamera();
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setCapturedFile(file);
    setPreviewUrl(createPreviewUrl(file));
  }, []);

  // Process and confirm photo
  const confirmPhoto = useCallback(async () => {
    if (!capturedFile) return;

    setProcessing(true);

    try {
      const result = await compressImage(capturedFile, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'jpeg',
        createThumbnail: true,
        thumbnailSize: 150
      });

      onPhotoCapture(result);
    } catch (error) {
      console.error('Photo processing error:', error);
      alert('Failed to process photo. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [capturedFile, onPhotoCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) {
        cleanupPreviewUrl(previewUrl);
      }
    };
  }, [stopCamera, previewUrl]);

  // Switch camera facing mode
  const switchCamera = useCallback(() => {
    const newFacingMode = camera.facingMode === 'user' ? 'environment' : 'user';
    setCamera(prev => ({ ...prev, facingMode: newFacingMode }));
    
    if (camera.isActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  }, [camera.facingMode, camera.isActive, stopCamera, startCamera]);

  // Reset to initial state
  const reset = useCallback(() => {
    if (previewUrl) {
      cleanupPreviewUrl(previewUrl);
    }
    setCapturedFile(null);
    setPreviewUrl(null);
    setCaptureMode('choose');
    stopCamera();
  }, [previewUrl, stopCamera]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    reset();
    onCancel();
  }, [reset, onCancel]);

  if (disabled) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Photo capture is currently disabled</p>
      </div>
    );
  }

  // Preview and confirm screen
  if (previewUrl && capturedFile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Preview Photo</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={reset}
            disabled={processing}
          >
            <X className="w-4 h-4 mr-1" />
            Retake
          </Button>
        </div>

        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={previewUrl}
            alt="Photo preview"
            className="w-full h-64 object-cover"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Photo will be optimized:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Compressed for faster uploads</li>
                <li>Resized to 1200px max (if larger)</li>
                <li>Thumbnail created for quick loading</li>
                <li>Original quality preserved for viewing</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={processing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmPhoto}
            disabled={processing}
            className="flex-1"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Add Photo
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Camera view
  if (captureMode === 'camera') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Take Photo</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCaptureMode('choose')}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {camera.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 font-medium">Camera Error</p>
            <p className="text-red-600 text-sm mt-1">{camera.error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCaptureMode('file')}
              className="mt-3"
            >
              <Upload className="w-4 h-4 mr-1" />
              Choose File Instead
            </Button>
          </div>
        ) : (
          <>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {!camera.isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}
            </div>

            {camera.isActive && (
              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={switchCamera}
                  title="Switch camera"
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  Flip
                </Button>

                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Capture
                </Button>

                <div className="w-20" /> {/* Spacer for balance */}
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // File selection mode
  if (captureMode === 'file') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Select Photo</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCaptureMode('choose')}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Choose a photo from your device
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Select File
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // Initial choice screen
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Add Photo</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isCameraSupported() && (
          <Button
            variant="secondary"
            onClick={() => setCaptureMode('camera')}
            className="p-6 h-auto flex-col space-y-2"
          >
            <Camera className="w-8 h-8" />
            <span className="font-medium">Take Photo</span>
            <span className="text-sm opacity-75">Use device camera</span>
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={() => setCaptureMode('file')}
          className="p-6 h-auto flex-col space-y-2"
        >
          <Upload className="w-8 h-8" />
          <span className="font-medium">Choose File</span>
          <span className="text-sm opacity-75">From device storage</span>
        </Button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        <p>Photos are automatically optimized and compressed for faster sharing.</p>
        <p>Maximum file size: 10MB • Supported formats: JPEG, PNG, WebP, HEIC</p>
      </div>
    </div>
  );
};