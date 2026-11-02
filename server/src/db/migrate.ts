/* ==================================================================
   Stellar · Migrationen
   Jede Migration läuft genau einmal. Welche schon gelaufen sind, steht
   in der Tabelle schema_migrations. Neue Änderungen am Schema kommen
   als neue Datei nach db/migrations/ und werden dort in index.ts eingetragen.
   ================================================================== */

import { pool, withTransaction } from './pool';
import { migrations } from './migrations';

// Fester Schlüssel für die Sperre: verhindert, dass zwei Instanzen gleichzeitig migrieren.
const MIGRATION_LOCK_KEY = 4_711_2026;

export async function runMigrations(): Promise<void> {
    const lockClient = await pool.connect();
    try {
        await lockClient.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
        await lockClient.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id         INTEGER PRIMARY KEY,
                name       TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

        const applied = await lockClient.query<{ id: number }>('SELECT id FROM schema_migrations');
        const appliedIds = new Set(applied.rows.map(row => row.id));

        for (const migration of migrations) {
            if (appliedIds.has(migration.id)) continue;
            console.log(`Migration ${migration.id}: ${migration.name}`);
            await withTransaction(async client => {
                await client.query(migration.sql);
                await client.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
            });
        }
    } finally {
        await lockClient.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
        lockClient.release();
    }
}
