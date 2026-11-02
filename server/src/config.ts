/* ==================================================================
   Stellar · Konfiguration
   Liest alle Einstellungen einmal aus den Umgebungsvariablen.
   ================================================================== */

import path from 'node:path';

function readPort(value: string | undefined, fallback: number): number {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 ? port : fallback;
}

export const config = {
    /** Port, auf dem der HTTP-Server lauscht */
    port: readPort(process.env.PORT, 3000),

    /** Verbindung zu PostgreSQL, z. B. postgres://user:pass@host:5432/stellar */
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://stellar:stellar@localhost:5432/stellar',

    /**
     * Ordner mit dem gebauten Frontend (client/dist).
     * Im Docker-Image liegt er neben dem Server, lokal zwei Ebenen höher.
     */
    clientDistDir: process.env.CLIENT_DIST_DIR ?? path.resolve(__dirname, '../../../../client/dist'),

    /** Wie lange gelöschte Seiten im Papierkorb bleiben (Tage) */
    trashRetentionDays: 30,
} as const;
