/* ==================================================================
   Migration 1 · Grundschema für Wiki und Projekte
   ================================================================== */

import type { Migration } from './index';

export const initialSchema: Migration = {
    id: 1,
    name: 'Grundschema: Wiki und Projekte',
    sql: `
        /* ---------------- Wiki ---------------- */

        CREATE TABLE pages (
            id              SERIAL PRIMARY KEY,
            -- Elternseite; NULL = oberste Ebene. Löschen der Elternseite löscht Unterseiten mit.
            parent_id       INTEGER REFERENCES pages(id) ON DELETE CASCADE,
            title           TEXT NOT NULL DEFAULT '',
            icon            TEXT,
            -- Inhalt als Liste von Blöcken (siehe shared/types.ts → Block)
            blocks          JSONB NOT NULL DEFAULT '[]'::jsonb,
            -- Reiner Text aller Blöcke, wird beim Speichern berechnet (für die Volltextsuche)
            content_text    TEXT NOT NULL DEFAULT '',
            position        DOUBLE PRECISION NOT NULL DEFAULT 0,
            is_favorite     BOOLEAN NOT NULL DEFAULT false,
            -- Gesetzt = im Papierkorb
            deleted_at      TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_visited_at TIMESTAMPTZ,
            search_vector   TSVECTOR GENERATED ALWAYS AS (
                setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('german', coalesce(content_text, '')), 'B')
            ) STORED
        );
        CREATE INDEX pages_parent_idx ON pages (parent_id, position);
        CREATE INDEX pages_search_idx ON pages USING GIN (search_vector);

        -- Verweise zwischen Seiten (aus [[Links]] und Unterseiten-Blöcken), für Rückverweise
        CREATE TABLE page_links (
            source_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            target_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            PRIMARY KEY (source_page_id, target_page_id)
        );
        CREATE INDEX page_links_target_idx ON page_links (target_page_id);

        /* ---------------- Projekte ---------------- */

        CREATE TABLE projects (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            color       TEXT NOT NULL DEFAULT 'blue',
            icon        TEXT,
            status      TEXT NOT NULL DEFAULT 'active',
            start_date  DATE,
            due_date    DATE,
            page_id     INTEGER REFERENCES pages(id) ON DELETE SET NULL,
            position    DOUBLE PRECISION NOT NULL DEFAULT 0,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE project_tasks (
            id          SERIAL PRIMARY KEY,
            project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title       TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status      TEXT NOT NULL DEFAULT 'todo',
            priority    SMALLINT NOT NULL DEFAULT 0,
            start_date  DATE,
            due_date    DATE,
            page_id     INTEGER REFERENCES pages(id) ON DELETE SET NULL,
            -- Reihenfolge innerhalb der Status-Spalte im Board
            position    DOUBLE PRECISION NOT NULL DEFAULT 0,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            done_at     TIMESTAMPTZ
        );
        CREATE INDEX project_tasks_project_idx ON project_tasks (project_id, status, position);

        CREATE TABLE project_labels (
            id         SERIAL PRIMARY KEY,
            name       TEXT NOT NULL,
            color      TEXT NOT NULL DEFAULT 'gray',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE project_task_labels (
            task_id  INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
            label_id INTEGER NOT NULL REFERENCES project_labels(id) ON DELETE CASCADE,
            PRIMARY KEY (task_id, label_id)
        );

        CREATE TABLE project_checklist_items (
            id         SERIAL PRIMARY KEY,
            task_id    INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
            text       TEXT NOT NULL,
            done       BOOLEAN NOT NULL DEFAULT false,
            position   DOUBLE PRECISION NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX project_checklist_task_idx ON project_checklist_items (task_id, position);
    `,
};
