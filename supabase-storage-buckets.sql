-- ============================================
-- MemeFlow - Storage Buckets for Supabase
-- ============================================

-- Create storage buckets for avatars, videos, and thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('videos', 'videos', true),
  ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure RLS is enabled on storage objects so these policies are enforced.
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;
