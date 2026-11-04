/* ==================================================================
   Stellar · Konfiguration
   Liest die Grundeinstellungen einmal aus den Umgebungsvariablen.
   Anbindungen (API-Token, Home Assistant, Briefing) stehen in
   settings/settings.service.ts – änderbar in der Oberfläche.
   ================================================================== */

import path from 'node:path';

function readPort(value: string | undefined, fallback: number): number {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 ? port : fallback;
}

/** Mindestlänge des API-Tokens – kürzere Tokens aus Umgebungsvariablen werden ignoriert */
export const MIN_API_TOKEN_LENGTH = 24;

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

    /** Wie oft der Planer nach fälligen Erinnerungen schaut */
    schedulerIntervalMs: 30_000,

    /** STELLAR_API_TOKEN gesetzt, aber zu kurz – wird beim Start gemeldet */
    apiTokenTooShort: (() => {
        const length = (process.env.STELLAR_API_TOKEN ?? '').trim().length;
        return length > 0 && length < MIN_API_TOKEN_LENGTH;
    })(),
} as const;
