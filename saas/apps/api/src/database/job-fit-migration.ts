import { readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';
export function migrateJobFit(db: Database.Database): void {
  const version='013_job_fit_phase2b'; db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  db.transaction(()=>{if(db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(version))return;db.exec(readFileSync(new URL('../../migrations/013_job_fit_phase2b.sql',import.meta.url),'utf8'));db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)').run(version,new Date().toISOString());if((db.pragma('foreign_key_check') as unknown[]).length)throw new Error('JOB_FIT_MIGRATION_FOREIGN_KEY_FAILURE');})();
}
