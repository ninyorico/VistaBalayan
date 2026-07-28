-- VistaBalayan business permit image support
-- Run in Supabase Dashboard > SQL Editor with owner/service privileges before using the upload UI.

-- Store municipal-review-only business permit image URLs separately from public listing photos.
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS business_permit_images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.establishments.business_permit_images IS
  'Business permit image URLs uploaded by establishment staff for municipal officer review. Not displayed on the public tourism listing.';

-- The app already uses the establishment-images bucket for public establishment photos.
-- This keeps permit uploads in a separate folder inside that bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'establishment-images',
  'establishment-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = COALESCE(storage.buckets.file_size_limit, 10485760),
    allowed_mime_types = COALESCE(storage.buckets.allowed_mime_types, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Authenticated establishment staff can upload permit images to the dedicated folder.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload establishment images'
  ) THEN
    CREATE POLICY "Authenticated users can upload establishment images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'establishment-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can read establishment images'
  ) THEN
    CREATE POLICY "Authenticated users can read establishment images"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'establishment-images');
  END IF;
END $$;

-- Public bucket URLs still work for existing public listing photos and officer permit previews.
