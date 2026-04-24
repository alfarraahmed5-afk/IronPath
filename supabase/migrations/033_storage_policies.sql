INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

INSERT INTO storage.buckets (id, name, public) VALUES ('gym-assets', 'gym-assets', true);
CREATE POLICY "gym_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'gym-assets');
CREATE POLICY "gym_assets_owner_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'gym-assets'
  AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'gym_id')
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('gym_owner','super_admin')
);

INSERT INTO storage.buckets (id, name, public) VALUES ('workout-media', 'workout-media', false);
CREATE POLICY "workout_media_gym_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'workout-media'
  AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'gym_id')
);
CREATE POLICY "workout_media_owner_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'workout-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
CREATE POLICY "workout_media_owner_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'workout-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-assets', 'exercise-assets', true);
CREATE POLICY "exercise_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'exercise-assets');

INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);
CREATE POLICY "progress_photos_owner_all" ON storage.objects FOR ALL USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
