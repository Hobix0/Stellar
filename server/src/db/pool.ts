/* ==================================================================
   Stellar · Datenbank-Verbindung (PostgreSQL)
   Ein gemeinsamer Verbindungs-Pool plus kleine Helfer für Abfragen
   und Transaktionen.
   ================================================================== */

import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { config } from '../config';

// Spalten vom Typ DATE als Text ('2026-11-02') liefern statt als JS-Date.
// Sonst verschiebt die Zeitzone des Servers das Datum um einen Tag.
const DATE_TYPE_OID = 1082;
types.setTypeParser(DATE_TYPE_OID, (value: string) => value);

export const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });

/** Alles, womit man SQL ausführen kann: der Pool oder ein Client in einer Transaktion. */
export type Queryable = Pick<Pool | PoolClient, 'query'>;

/** Führt eine Abfrage aus und gibt alle Zeilen zurück. */
export async function queryRows<Row extends QueryResultRow>(
    sql: string,
    params: unknown[] = [],
    db: Queryable = pool,
): Promise<Row[]> {
    const result = await db.query<Row>(sql, params);
    return result.rows;
}

/** Führt eine Abfrage aus und gibt die erste Zeile zurück (oder null). */
export async function queryOne<Row extends QueryResultRow>(
    sql: string,
    params: unknown[] = [],
    db: Queryable = pool,
): Promise<Row | null> {
    const rows = await queryRows<Row>(sql, params, db);
    return rows[0] ?? null;
}

/**
 * Führt `work` in einer Transaktion aus.
 * Wirft `work` einen Fehler, wird alles zurückgerollt.
 */
export async function withTransaction<Result>(work: (client: PoolClient) => Promise<Result>): Promise<Result> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Wartet, bis die Datenbank erreichbar ist.
 * Beim gemeinsamen Start (Docker/Umbrel) braucht PostgreSQL oft ein paar Sekunden länger als die App.
 */
export async function waitForDatabase(maxAttempts = 30, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await pool.query('SELECT 1');
            return;
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            console.log(`Datenbank noch nicht erreichbar (Versuch ${attempt}/${maxAttempts}) …`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
