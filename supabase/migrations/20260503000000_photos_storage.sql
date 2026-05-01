-- ============================================================================
-- Bucket Supabase Storage pour les photos perso uploadées par les agents
-- ============================================================================
-- Path layout : {user_id}/{roadbook_id}/{photo_id}.{ext}
-- Public read : nécessaire car les photos s'affichent dans les PDFs et sur
-- les pages publiques /voyage/{token}.
-- Authenticated write : seul l'agent peut uploader, et uniquement dans son
-- propre dossier (vérifié via la policy storage.foldername(name)[1] = uid).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'roadbook-photos',
  'roadbook-photos',
  TRUE,                                 -- public en lecture
  10 * 1024 * 1024,                     -- 10 MB max par photo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Policies (lecture publique, écriture authentifiée + folder par user)
-- ============================================================================

-- DROP existing policies if any (idempotent)
DROP POLICY IF EXISTS "Public read roadbook photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own photos" ON storage.objects;

-- 1. Lecture publique (anon + authenticated) — les photos sont accessibles
--    via leur URL publique pour l'export PDF et la page voyage publique.
CREATE POLICY "Public read roadbook photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'roadbook-photos');

-- 2. Upload : seuls les utilisateurs authentifiés, et UNIQUEMENT dans leur
--    propre dossier (préfixe = leur user_id).
CREATE POLICY "Authenticated upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'roadbook-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Update : pareil, restreint au dossier perso
CREATE POLICY "Authenticated update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'roadbook-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Delete : pareil
CREATE POLICY "Authenticated delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'roadbook-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
