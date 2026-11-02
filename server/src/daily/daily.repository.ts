/* ==================================================================
   Stellar · Tagesnotizen
   Eine Tagesnotiz ist eine normale Wiki-Seite mit gesetztem daily_date.
   Sie wird beim ersten Öffnen eines Tages angelegt.
   ================================================================== */

import type { Page } from '../../../shared/types';
import { queryRows } from '../db/pool';
import { createBlockId } from '../wiki/blocks';
import { findPage } from '../wiki/pages.repository';

/** '2026-11-02' → 'Montag, 2. November 2026' */
export function formatDailyTitle(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    // Mittags in UTC, damit keine Zeitzone das Datum verschiebt
    const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Liefert die Tagesnotiz eines Tages und legt sie bei Bedarf an. */
export async function openDailyNote(isoDate: string): Promise<Page> {
    const initialBlocks = [{ id: createBlockId(), type: 'text', content: '' }];
    // ON CONFLICT: gleichzeitige Aufrufe für denselben Tag legen keine zweite Seite an
    await queryRows(
        `INSERT INTO pages (title, icon, blocks, daily_date, position)
         VALUES ($1, '📅', $2::jsonb, $3, 0)
         ON CONFLICT (daily_date) DO NOTHING`,
        [formatDailyTitle(isoDate), JSON.stringify(initialBlocks), isoDate],
    );
    const rows = await queryRows<{ id: number; deleted_at: Date | null }>(
        'SELECT id, deleted_at FROM pages WHERE daily_date = $1',
        [isoDate],
    );
    const row = rows[0]!;
    // Liegt die Tagesnotiz im Papierkorb, holen wir sie zurück – der Tag soll immer erreichbar sein
    if (row.deleted_at) await queryRows('UPDATE pages SET deleted_at = NULL WHERE id = $1', [row.id]);
    return (await findPage(row.id))!;
}

/** Alle Tage eines Monats (JJJJ-MM), für die es eine Tagesnotiz mit Inhalt gibt. */
export async function listDailyDatesInMonth(yearMonth: string): Promise<string[]> {
    const rows = await queryRows<{ daily_date: string }>(
        `SELECT daily_date FROM pages
         WHERE deleted_at IS NULL AND content_text <> ''
           AND to_char(daily_date, 'YYYY-MM') = $1
         ORDER BY daily_date`,
        [yearMonth],
    );
    return rows.map(row => row.daily_date);
}

/**
 * Löscht leere Tagesnotizen vergangener Tage (nur angeklickt, nichts geschrieben),
 * sofern nichts auf sie verweist und sie keine Unterseiten haben.
 */
export async function purgeEmptyPastDailyNotes(): Promise<number> {
    const rows = await queryRows(
        `DELETE FROM pages p
         WHERE p.daily_date < current_date
           AND p.content_text = ''
           AND jsonb_array_length(p.blocks) <= 1
           AND NOT EXISTS (SELECT 1 FROM pages child WHERE child.parent_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM page_links l WHERE l.target_page_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM projects pr WHERE pr.page_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM project_tasks t WHERE t.page_id = p.id)
         RETURNING p.id`,
    );
    return rows.length;
}
