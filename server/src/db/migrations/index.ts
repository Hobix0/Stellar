/* ==================================================================
   Stellar · Liste aller Migrationen (aufsteigend nach id)
   ================================================================== */

import { initialSchema } from './001-initial-schema';
import { dailyNotesAndInbox } from './002-daily-notes-and-inbox';
import { reminders } from './003-reminders';

export interface Migration {
    /** Fortlaufende Nummer – nie ändern, wenn sie einmal veröffentlicht ist */
    id: number;
    name: string;
    sql: string;
}

export const migrations: Migration[] = [initialSchema, dailyNotesAndInbox, reminders];
