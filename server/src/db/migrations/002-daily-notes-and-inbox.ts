/* ==================================================================
   Migration 2 · Tagesnotizen und Inbox
   - pages.daily_date: Datum, wenn die Seite die Tagesnotiz dieses Tages ist
   - inbox_items: schnell notierte Gedanken, die später einsortiert werden
   ================================================================== */

import type { Migration } from './index';

export const dailyNotesAndInbox: Migration = {
    id: 2,
    name: 'Tagesnotizen und Inbox',
    sql: `
        -- Höchstens eine Tagesnotiz je Tag
        ALTER TABLE pages ADD COLUMN daily_date DATE UNIQUE;

        CREATE TABLE inbox_items (
            id         SERIAL PRIMARY KEY,
            text       TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `,
};
