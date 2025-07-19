/**
 * Image compression and optimization utilities
 * Handles resizing, compression, and format optimization for visit photos
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
  createThumbnail?: boolean
  thumbnailSize?: number
}

export interface CompressionResult {
  compressedFile: File
  originalSize: number
  compressedSize: number
  thumbnail?: File
  width: number
  height: number
  compressionRatio: number
}

/**
 * Compress an image file with smart optimization
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'jpeg',
    createThumbnail = true,
    thumbnailSize = 150
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = async () => {
      try {
        // Calculate optimal dimensions
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight
        )

        // Create main compressed image
        const compressedFile = await createCompressedFile(
          img, 
          newWidth, 
          newHeight, 
          quality, 
          format,
          file.name
        )

        // Create thumbnail if requested
        let thumbnail: File | undefined
        if (createThumbnail) {
          const { width: thumbWidth, height: thumbHeight } = calculateDimensions(
            img.width,
            img.height,
            thumbnailSize,
            thumbnailSize
          )
          
          thumbnail = await createCompressedFile(
            img,
            thumbWidth,
            thumbHeight,
            0.7, // Lower quality for thumbnails
            format,
            `thumb_${file.name}`
          )
        }

        const compressionRatio = ((file.size - compressedFile.size) / file.size) * 100

        resolve({
          compressedFile,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          thumbnail,
          width: newWidth,
          height: newHeight,
          compressionRatio
        })
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number, 
  originalHeight: number, 
  maxWidth: number, 
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight }

  // Calculate scaling factor
  const widthRatio = maxWidth / width
  const heightRatio = maxHeight / height
  const ratio = Math.min(widthRatio, heightRatio, 1) // Don't upscale

  width = Math.round(width * ratio)
  height = Math.round(height * ratio)

  return { width, height }
}

/**
 * Create compressed file from image element
 */
async function createCompressedFile(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  format: string,
  filename: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    canvas.width = width
    canvas.height = height

    // Apply image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, width, height)

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'))
          return
        }

        // Create file from blob
        const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`
        const extension = format === 'jpeg' ? 'jpg' : format
        
        // Generate filename with proper extension
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
        const compressedFilename = `${nameWithoutExt}.${extension}`

        const file = new File([blob], compressedFilename, { 
          type: mimeType,
          lastModified: Date.now()
        })

        resolve(file)
      },
      format === 'jpeg' ? 'image/jpeg' : `image/${format}`,
      quality
    )
  })
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Please select a valid image file (JPEG, PNG, WebP, or HEIC)' 
    }
  }

  // Check file size (max 10MB original)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'Image file must be smaller than 10MB' 
    }
  }

  return { valid: true }
}

/**
 * Get estimated compression savings
 */
export function estimateCompressionSavings(
  originalSize: number, 
  targetQuality: number = 0.8
): number {
  // Rough estimation based on typical JPEG compression ratios
  const baseReduction = 0.3 // 30% reduction from PNG to JPEG
  const qualityReduction = (1 - targetQuality) * 0.4 // Additional reduction from quality
  const totalReduction = Math.min(baseReduction + qualityReduction, 0.8) // Max 80% reduction
  
  return Math.round(originalSize * (1 - totalReduction))
}

/**
 * Create a preview URL for immediate display (before upload)
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Cleanup preview URL to prevent memory leaks
 */
export function cleanupPreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}