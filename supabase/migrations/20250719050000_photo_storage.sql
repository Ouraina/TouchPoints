/*
  # Photo Storage Setup Migration
  
  Creates Supabase Storage bucket and policies for visit photos.
  Enables secure photo sharing within care circles with proper access controls.
*/

-- Create storage bucket for visit photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visit-photos',
  'visit-photos', 
  false, -- Private bucket
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- Storage policies for visit photos
CREATE POLICY "Users can view photos for their circles"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'visit-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT v.circle_id::text 
      FROM visits v 
      JOIN circle_members cm ON cm.circle_id = v.circle_id
      WHERE cm.user_id::text = auth.uid()::text
      AND v.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Users can upload photos for their visits"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'visit-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT v.circle_id::text 
      FROM visits v 
      JOIN circle_members cm ON cm.circle_id = v.circle_id
      WHERE cm.user_id::text = auth.uid()::text
      AND v.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'visit-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT v.circle_id::text 
      FROM visits v 
      JOIN circle_members cm ON cm.circle_id = v.circle_id
      WHERE cm.user_id::text = auth.uid()::text
      AND v.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Users can delete photos from their visits"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'visit-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT v.circle_id::text 
      FROM visits v 
      JOIN circle_members cm ON cm.circle_id = v.circle_id
      WHERE cm.user_id::text = auth.uid()::text
      AND v.id::text = (storage.foldername(name))[2]
    )
  );

-- Update visit_attachments table with additional photo metadata
ALTER TABLE visit_attachments 
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS compression_quality INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS upload_status TEXT CHECK (upload_status IN ('uploading', 'completed', 'failed', 'queued')) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_file_size INTEGER,
ADD COLUMN IF NOT EXISTS compressed_file_size INTEGER;

-- Index for efficient photo queries
CREATE INDEX IF NOT EXISTS idx_visit_attachments_photo_type ON visit_attachments(visit_id, file_type) WHERE file_type = 'photo';
CREATE INDEX IF NOT EXISTS idx_visit_attachments_upload_status ON visit_attachments(upload_status, created_at) WHERE upload_status != 'completed';

-- Function to get photo URL with fallback
CREATE OR REPLACE FUNCTION get_photo_url(
  storage_path_param TEXT,
  thumbnail_path_param TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
  -- Return thumbnail URL if available, otherwise full photo URL
  IF thumbnail_path_param IS NOT NULL THEN
    RETURN (SELECT url FROM storage.objects WHERE name = thumbnail_path_param LIMIT 1);
  ELSE
    RETURN (SELECT url FROM storage.objects WHERE name = storage_path_param LIMIT 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned photos (photos without visit_attachments records)
CREATE OR REPLACE FUNCTION cleanup_orphaned_photos()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects 
  WHERE bucket_id = 'visit-photos' 
  AND name NOT IN (
    SELECT storage_path FROM visit_attachments 
    WHERE storage_path IS NOT NULL
    UNION
    SELECT thumbnail_path FROM visit_attachments 
    WHERE thumbnail_path IS NOT NULL
  )
  AND created_at < NOW() - INTERVAL '24 hours'; -- Only delete photos older than 24 hours
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;