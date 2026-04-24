ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_trainer_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_built_routines ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth_gym_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid;
$$ LANGUAGE sql STABLE;

CREATE POLICY "gym_workouts_read" ON workouts FOR SELECT USING (
  gym_id = auth_gym_id() AND (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'followers' AND EXISTS(
      SELECT 1 FROM follows WHERE follower_id = auth.uid()
        AND following_id = workouts.user_id AND status = 'active'
    ))
  )
);
CREATE POLICY "gym_workouts_insert" ON workouts FOR INSERT WITH CHECK (
  user_id = auth.uid() AND gym_id = auth_gym_id()
);
CREATE POLICY "gym_workouts_update" ON workouts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "gym_workouts_delete" ON workouts FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "gym_users_read" ON users FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "own_user_update" ON users FOR UPDATE USING (id = auth.uid());

CREATE POLICY "exercises_read" ON exercises FOR SELECT USING (
  gym_id IS NULL OR gym_id = auth_gym_id()
);
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (gym_id = auth_gym_id());
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (
  created_by = auth.uid() OR (is_gym_template = true AND EXISTS(
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'gym_owner'
  ))
);

CREATE POLICY "gym_read_routines" ON routines FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_routine_folders" ON routine_folders FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_follows" ON follows FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_workout_likes" ON workout_likes FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_workout_comments" ON workout_comments FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_announcements" ON gym_announcements FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_leaderboard_snapshots" ON leaderboard_snapshots FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_leaderboard_challenges" ON leaderboard_challenges FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_challenge_results" ON challenge_results FOR SELECT USING (gym_id = auth_gym_id());
CREATE POLICY "gym_read_personal_records" ON personal_records FOR SELECT USING (gym_id = auth_gym_id());

CREATE POLICY "own_user_settings" ON user_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_streaks" ON streaks FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_user_badges" ON user_badges FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_monthly_reports" ON monthly_reports FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_ai_trainer" ON ai_trainer_programs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_notifications" ON notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_push_tokens" ON user_push_tokens FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_body_measurements" ON body_measurements FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_measurement_photos" ON measurement_photos FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_workout_exercises" ON workout_exercises FOR SELECT USING (
  EXISTS(SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.gym_id = auth_gym_id())
);
CREATE POLICY "own_workout_sets" ON workout_sets FOR SELECT USING (
  EXISTS(SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_exercise_id AND w.gym_id = auth_gym_id())
);
CREATE POLICY "own_routine_exercises" ON routine_exercises FOR SELECT USING (
  EXISTS(SELECT 1 FROM routines r WHERE r.id = routine_id AND r.gym_id = auth_gym_id())
);
CREATE POLICY "own_routine_sets" ON routine_sets FOR SELECT USING (
  EXISTS(SELECT 1 FROM routine_exercises re
    JOIN routines r ON r.id = re.routine_id
    WHERE re.id = routine_exercise_id AND r.gym_id = auth_gym_id())
);

CREATE POLICY "prebuilt_read_all" ON pre_built_routines FOR SELECT USING (auth.uid() IS NOT NULL);
