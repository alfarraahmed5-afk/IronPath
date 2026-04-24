import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('ironpath.db');

export function initDB(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS active_workout_draft (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      workout_name TEXT NOT NULL,
      routine_id TEXT,
      started_at TEXT NOT NULL,
      elapsed_seconds INTEGER NOT NULL DEFAULT 0,
      client_upload_uuid TEXT,
      state_json TEXT NOT NULL
    )
  `);
}

export { db };
