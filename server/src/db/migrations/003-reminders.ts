/* ==================================================================
   Migration 3 · Erinnerungen und App-Zustand
   - reminders: Text + Zeitpunkt, optional wiederkehrend und mit Aufgabe verknüpft
   - app_state: kleine Schlüssel/Wert-Ablage (z. B. „Briefing heute schon gesendet“)
   ================================================================== */

import type { Migration } from './index';

export const reminders: Migration = {
    id: 3,
    name: 'Erinnerungen und App-Zustand',
    sql: `
        CREATE TABLE reminders (
            id          SERIAL PRIMARY KEY,
            text        TEXT NOT NULL,
            -- Nächster fälliger Zeitpunkt; bei Wiederholungen rückt er nach jeder Benachrichtigung weiter
            due_at      TIMESTAMPTZ NOT NULL,
            -- none | daily | weekdays | weekly | monthly
            recurrence  TEXT NOT NULL DEFAULT 'none',
            task_id     INTEGER REFERENCES project_tasks(id) ON DELETE SET NULL,
            notified_at TIMESTAMPTZ,
            -- Gesetzt = erledigt
            done_at     TIMESTAMPTZ,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX reminders_open_idx ON reminders (due_at) WHERE done_at IS NULL;

        CREATE TABLE app_state (
            key        TEXT PRIMARY KEY,
            value      TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `,
};
