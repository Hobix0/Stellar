/* ==================================================================
   Stellar · Startpunkt des Servers
   1. auf die Datenbank warten  2. Migrationen ausführen
   3. HTTP-Server starten       4. täglich aufräumen (Papierkorb, leere Tagesnotizen)
   ================================================================== */

import { createApp } from './app';
import { purgeEmptyPastDailyNotes } from './daily/daily.repository';
import { config } from './config';
import { runMigrations } from './db/migrate';
import { pool, waitForDatabase } from './db/pool';
import { purgeOldTrash } from './wiki/pages.repository';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function cleanUpTrash(): Promise<void> {
    try {
        const removed = await purgeOldTrash(config.trashRetentionDays);
        if (removed > 0) console.log(`Papierkorb: ${removed} alte Seite(n) endgültig gelöscht`);
        const emptyDailyNotes = await purgeEmptyPastDailyNotes();
        if (emptyDailyNotes > 0) console.log(`${emptyDailyNotes} leere Tagesnotiz(en) entfernt`);
    } catch (error) {
        console.error('Papierkorb aufräumen fehlgeschlagen:', error);
    }
}

async function main(): Promise<void> {
    await waitForDatabase();
    await runMigrations();

    const server = createApp().listen(config.port, () => {
        console.log(`Stellar läuft auf http://localhost:${config.port}`);
    });

    await cleanUpTrash();
    const trashTimer = setInterval(cleanUpTrash, ONE_DAY_MS);

    // Sauber herunterfahren, wenn Docker/Umbrel den Container stoppt
    const shutdown = () => {
        console.log('Stellar wird beendet …');
        clearInterval(trashTimer);
        server.close(() => void pool.end().then(() => process.exit(0)));
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main().catch(error => {
    console.error('Start fehlgeschlagen:', error);
    process.exit(1);
});
