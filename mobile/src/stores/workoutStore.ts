import { create } from 'zustand';
import { db } from '../lib/db';

export interface WorkoutSet {
  position: number;
  set_type: 'normal' | 'warmup' | 'dropset' | 'failure';
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  is_completed: boolean;
  completed_at: string | null;
}

export interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  logging_type: 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance';
  position: number;
  superset_group: number | null;
  rest_seconds: number;
  notes: string;
  sets: WorkoutSet[];
}

export interface ActiveWorkout {
  workout_name: string;
  routine_id: string | null;
  started_at: string;
  elapsed_seconds: number;
  client_upload_uuid: string;
  exercises: WorkoutExercise[];
}

interface WorkoutStore {
  active: ActiveWorkout | null;
  idempotency_key: string | null;
  restTimer: number | null; // seconds remaining
  restTimerInterval: ReturnType<typeof setInterval> | null;

  // Actions
  startWorkout: (name: string, routine_id?: string | null, exercises?: WorkoutExercise[]) => void;
  resumeWorkout: (draft: ActiveWorkout, idempotency_key: string) => void;
  updateExerciseSets: (exercisePosition: number, sets: WorkoutSet[]) => void;
  addExercise: (exercise: WorkoutExercise) => void;
  removeExercise: (position: number) => void;
  updateWorkoutName: (name: string) => void;
  tickElapsed: () => void;
  completeSet: (exercisePosition: number, setPosition: number) => void;
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;
  discardWorkout: () => void;
  saveDraft: () => void;
  loadDraft: () => { draft: ActiveWorkout; idempotency_key: string } | null;
  clearDraft: () => void;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  active: null,
  idempotency_key: null,
  restTimer: null,
  restTimerInterval: null,

  startWorkout: (name, routine_id = null, exercises = []) => {
    const idempotency_key = generateUUID();
    const client_upload_uuid = generateUUID();
    const workout: ActiveWorkout = {
      workout_name: name,
      routine_id,
      started_at: new Date().toISOString(),
      elapsed_seconds: 0,
      client_upload_uuid,
      exercises,
    };
    set({ active: workout, idempotency_key });
    get().saveDraft();
  },

  resumeWorkout: (draft, idempotency_key) => {
    set({ active: draft, idempotency_key });
  },

  updateExerciseSets: (exercisePosition, sets) => {
    const { active } = get();
    if (!active) return;
    const exercises = active.exercises.map(ex =>
      ex.position === exercisePosition ? { ...ex, sets } : ex
    );
    set({ active: { ...active, exercises } });
    get().saveDraft();
  },

  addExercise: (exercise) => {
    const { active } = get();
    if (!active) return;
    set({ active: { ...active, exercises: [...active.exercises, exercise] } });
    get().saveDraft();
  },

  removeExercise: (position) => {
    const { active } = get();
    if (!active) return;
    const exercises = active.exercises
      .filter(ex => ex.position !== position)
      .map((ex, i) => ({ ...ex, position: i }));
    set({ active: { ...active, exercises } });
    get().saveDraft();
  },

  updateWorkoutName: (name) => {
    const { active } = get();
    if (!active) return;
    set({ active: { ...active, workout_name: name } });
    get().saveDraft();
  },

  tickElapsed: () => {
    const { active } = get();
    if (!active) return;
    set({ active: { ...active, elapsed_seconds: active.elapsed_seconds + 1 } });
  },

  completeSet: (exercisePosition, setPosition) => {
    const { active } = get();
    if (!active) return;
    const exercises = active.exercises.map(ex => {
      if (ex.position !== exercisePosition) return ex;
      const sets = ex.sets.map(s => {
        if (s.position !== setPosition) return s;
        return { ...s, is_completed: !s.is_completed, completed_at: !s.is_completed ? new Date().toISOString() : null };
      });
      return { ...ex, sets };
    });
    set({ active: { ...active, exercises } });
    get().saveDraft();
  },

  startRestTimer: (seconds) => {
    const { restTimerInterval } = get();
    if (restTimerInterval) clearInterval(restTimerInterval);
    set({ restTimer: seconds });
    const interval = setInterval(() => {
      const { restTimer } = get();
      if (restTimer === null || restTimer <= 0) {
        clearInterval(interval);
        set({ restTimer: null, restTimerInterval: null });
      } else {
        set({ restTimer: restTimer - 1 });
      }
    }, 1000);
    set({ restTimerInterval: interval });
  },

  clearRestTimer: () => {
    const { restTimerInterval } = get();
    if (restTimerInterval) clearInterval(restTimerInterval);
    set({ restTimer: null, restTimerInterval: null });
  },

  discardWorkout: () => {
    get().clearRestTimer();
    get().clearDraft();
    set({ active: null, idempotency_key: null });
  },

  saveDraft: () => {
    const { active, idempotency_key } = get();
    if (!active || !idempotency_key) return;
    try {
      const existing = db.getFirstSync('SELECT id FROM active_workout_draft WHERE id = 1');
      const state_json = JSON.stringify(active.exercises);
      if (existing) {
        db.runSync(
          'UPDATE active_workout_draft SET workout_name = ?, routine_id = ?, started_at = ?, elapsed_seconds = ?, client_upload_uuid = ?, state_json = ? WHERE id = 1',
          [active.workout_name, active.routine_id ?? null, active.started_at, active.elapsed_seconds, active.client_upload_uuid, state_json]
        );
      } else {
        db.runSync(
          'INSERT INTO active_workout_draft (id, workout_name, routine_id, started_at, elapsed_seconds, client_upload_uuid, state_json) VALUES (1, ?, ?, ?, ?, ?, ?)',
          [active.workout_name, active.routine_id ?? null, active.started_at, active.elapsed_seconds, active.client_upload_uuid, state_json]
        );
      }
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  },

  loadDraft: () => {
    try {
      const row = db.getFirstSync<{ workout_name: string; routine_id: string | null; started_at: string; elapsed_seconds: number; client_upload_uuid: string; state_json: string }>(
        'SELECT * FROM active_workout_draft WHERE id = 1'
      );
      if (!row) return null;
      const draft: ActiveWorkout = {
        workout_name: row.workout_name,
        routine_id: row.routine_id,
        started_at: row.started_at,
        elapsed_seconds: row.elapsed_seconds,
        client_upload_uuid: row.client_upload_uuid,
        exercises: JSON.parse(row.state_json),
      };
      return { draft, idempotency_key: generateUUID() };
    } catch {
      return null;
    }
  },

  clearDraft: () => {
    try { db.runSync('DELETE FROM active_workout_draft WHERE id = 1'); } catch {}
  },
}));
