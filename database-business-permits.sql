-- VistaBalayan business permit image support (optional hardening migration)
-- The deployed app can save permit pictures without this migration by storing a private
-- metadata marker in the existing establishments.amenities field. Run this optional SQL
-- later if you want a dedicated business_permit_images column for cleaner storage.

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS business_permit_images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.establishments.business_permit_images IS
  'Business permit image URLs/data references uploaded by establishment staff for municipal officer review. Not displayed on the public tourism listing.';

-- Optional: create the storage bucket if you later switch permit storage from inline
-- compressed images to Supabase Storage URLs.
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
