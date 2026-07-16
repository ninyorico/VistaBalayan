-- =====================================================
-- VISTABALAYAN PUBLIC ESTABLISHMENT RATINGS
-- Run this in the Supabase SQL Editor with owner/admin privileges.
--
-- Public users submit a 1-5 star rating through a locked RPC.
-- The raw rating table is not exposed to anon/authenticated clients.
-- The public page reads only aggregate summaries for active public stays.
-- Visitor tokens are hashed before storage.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.establishment_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  visitor_token_hash TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (establishment_id, visitor_token_hash)
);

ALTER TABLE public.establishment_ratings
  ADD COLUMN IF NOT EXISTS visitor_token_hash TEXT;

-- If an older draft table with raw visitor_token exists, hash it once so the
-- final public implementation does not need to expose or keep raw tokens.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'establishment_ratings'
      AND column_name = 'visitor_token'
  ) THEN
    EXECUTE 'UPDATE public.establishment_ratings SET visitor_token_hash = encode(digest(visitor_token, ''sha256''), ''hex'') WHERE visitor_token_hash IS NULL';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS establishment_ratings_establishment_token_hash_idx
  ON public.establishment_ratings (establishment_id, visitor_token_hash);

CREATE INDEX IF NOT EXISTS establishment_ratings_establishment_id_idx
  ON public.establishment_ratings (establishment_id);

CREATE OR REPLACE FUNCTION public.set_establishment_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_establishment_ratings_updated_at ON public.establishment_ratings;
CREATE TRIGGER set_establishment_ratings_updated_at
  BEFORE UPDATE ON public.establishment_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_establishment_ratings_updated_at();

ALTER TABLE public.establishment_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read establishment ratings" ON public.establishment_ratings;
DROP POLICY IF EXISTS "Public can insert establishment ratings" ON public.establishment_ratings;
DROP POLICY IF EXISTS "Public can update establishment ratings" ON public.establishment_ratings;

REVOKE ALL ON public.establishment_ratings FROM anon, authenticated;

DROP VIEW IF EXISTS public.establishment_rating_summaries;
CREATE VIEW public.establishment_rating_summaries AS
SELECT
  ratings.establishment_id,
  ROUND(AVG(ratings.rating)::numeric, 1)::float AS average_rating,
  COUNT(*)::integer AS rating_count
FROM public.establishment_ratings ratings
JOIN public.establishments establishments
  ON establishments.id = ratings.establishment_id
WHERE establishments.status = 'active'
  AND (
    LOWER(establishments.type) LIKE '%hotel%'
    OR LOWER(establishments.type) LIKE '%inn%'
    OR LOWER(establishments.type) LIKE '%lodge%'
    OR LOWER(establishments.type) LIKE '%resort%'
    OR LOWER(establishments.type) LIKE '%pool%'
    OR LOWER(establishments.type) LIKE '%farm%'
  )
GROUP BY ratings.establishment_id;

GRANT SELECT ON public.establishment_rating_summaries TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_establishment_rating(
  p_establishment_id UUID,
  p_visitor_token TEXT,
  p_rating INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_token TEXT := trim(p_visitor_token);
  token_hash TEXT;
  public_establishment_exists BOOLEAN;
BEGIN
  IF p_establishment_id IS NULL THEN
    RAISE EXCEPTION 'establishment_id is required';
  END IF;

  IF normalized_token IS NULL OR length(normalized_token) < 16 OR length(normalized_token) > 128 THEN
    RAISE EXCEPTION 'valid visitor token is required';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.establishments establishments
    WHERE establishments.id = p_establishment_id
      AND establishments.status = 'active'
      AND (
        LOWER(establishments.type) LIKE '%hotel%'
        OR LOWER(establishments.type) LIKE '%inn%'
        OR LOWER(establishments.type) LIKE '%lodge%'
        OR LOWER(establishments.type) LIKE '%resort%'
        OR LOWER(establishments.type) LIKE '%pool%'
        OR LOWER(establishments.type) LIKE '%farm%'
      )
  ) INTO public_establishment_exists;

  IF NOT public_establishment_exists THEN
    RAISE EXCEPTION 'establishment is not publicly rateable';
  END IF;

  token_hash := encode(digest(normalized_token, 'sha256'), 'hex');

  INSERT INTO public.establishment_ratings (establishment_id, visitor_token_hash, rating)
  VALUES (p_establishment_id, token_hash, p_rating)
  ON CONFLICT (establishment_id, visitor_token_hash)
  DO UPDATE SET rating = EXCLUDED.rating;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_establishment_rating(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_establishment_rating(UUID, TEXT, INTEGER) TO anon, authenticated;
