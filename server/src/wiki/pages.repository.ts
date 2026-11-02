/* ==================================================================
   Stellar · Datenzugriff für Wiki-Seiten
   Alle SQL-Abfragen rund um Seiten liegen hier; die Routen rufen nur
   diese Funktionen auf.
   ================================================================== */

import type { Backlink, Block, Page, PageSummary } from '../../../shared/types';
import { queryOne, queryRows, withTransaction, type Queryable } from '../db/pool';
import { blocksToPlainText, collectLinkedPageIds, createBlockId } from './blocks';

/** Eine Zeile der Tabelle `pages`, wie sie aus PostgreSQL kommt. */
interface PageRow {
    id: number;
    parent_id: number | null;
    title: string;
    icon: string | null;
    blocks: Block[];
    position: number;
    is_favorite: boolean;
    deleted_at: Date | null;
    created_at: Date;
    updated_at: Date;
    daily_date: string | null;
}

const SUMMARY_COLUMNS = 'id, parent_id, title, icon, position, is_favorite, updated_at, daily_date';

function toPageSummary(row: Omit<PageRow, 'blocks' | 'created_at' | 'deleted_at'>): PageSummary {
    return {
        id: row.id,
        parentId: row.parent_id,
        title: row.title,
        icon: row.icon,
        isFavorite: row.is_favorite,
        position: row.position,
        updatedAt: row.updated_at.toISOString(),
        dailyDate: row.daily_date,
    };
}

function toPage(row: PageRow): Page {
    return {
        ...toPageSummary(row),
        blocks: row.blocks,
        createdAt: row.created_at.toISOString(),
        deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    };
}

/* ------------------------------------------------------------------ */
/*  Lesen                                                             */
/* ------------------------------------------------------------------ */

/** Alle Seiten außerhalb des Papierkorbs (für den Seitenbaum). */
export async function listPages(): Promise<PageSummary[]> {
    const rows = await queryRows<PageRow>(
        `SELECT ${SUMMARY_COLUMNS} FROM pages WHERE deleted_at IS NULL ORDER BY parent_id NULLS FIRST, position, id`,
    );
    return rows.map(toPageSummary);
}

export async function findPage(pageId: number): Promise<Page | null> {
    const row = await queryOne<PageRow>('SELECT * FROM pages WHERE id = $1', [pageId]);
    return row ? toPage(row) : null;
}

/** Merkt sich den Besuch einer Seite (für „Zuletzt besucht“). */
export async function markPageVisited(pageId: number): Promise<void> {
    await queryRows('UPDATE pages SET last_visited_at = now() WHERE id = $1', [pageId]);
}

export async function listRecentPages(limit = 8): Promise<PageSummary[]> {
    const rows = await queryRows<PageRow>(
        `SELECT ${SUMMARY_COLUMNS} FROM pages
         WHERE deleted_at IS NULL AND last_visited_at IS NOT NULL
         ORDER BY last_visited_at DESC LIMIT $1`,
        [limit],
    );
    return rows.map(toPageSummary);
}

/** Seiten im Papierkorb – nur die „obersten“ gelöschten, nicht jede Unterseite einzeln. */
export async function listTrashedPages(): Promise<(PageSummary & { deletedAt: string })[]> {
    const rows = await queryRows<PageRow>(
        `SELECT p.* FROM pages p
         LEFT JOIN pages parent ON parent.id = p.parent_id
         WHERE p.deleted_at IS NOT NULL
           AND (parent.id IS NULL OR parent.deleted_at IS NULL OR parent.deleted_at <> p.deleted_at)
         ORDER BY p.deleted_at DESC`,
    );
    return rows.map(row => ({ ...toPageSummary(row), deletedAt: (row.deleted_at as Date).toISOString() }));
}

/** Seiten, die auf `pageId` verlinken. */
export async function listBacklinks(pageId: number): Promise<Backlink[]> {
    return queryRows<Backlink>(
        `SELECT p.id, p.title, p.icon FROM page_links l
         JOIN pages p ON p.id = l.source_page_id
         WHERE l.target_page_id = $1 AND p.deleted_at IS NULL AND p.id <> $1
         ORDER BY p.title`,
        [pageId],
    );
}

/* ------------------------------------------------------------------ */
/*  Schreiben                                                         */
/* ------------------------------------------------------------------ */

/** Nächste freie Position am Ende einer Ebene des Seitenbaums. */
async function nextPosition(db: Queryable, parentId: number | null): Promise<number> {
    const row = await queryOne<{ max: number | null }>(
        'SELECT max(position) AS max FROM pages WHERE parent_id IS NOT DISTINCT FROM $1',
        [parentId],
        db,
    );
    return (row?.max ?? -1) + 1;
}

/** Speichert die Verweise einer Seite neu (für Rückverweise). */
async function replacePageLinks(db: Queryable, pageId: number, blocks: Block[]): Promise<void> {
    await db.query('DELETE FROM page_links WHERE source_page_id = $1', [pageId]);
    const targetIds = collectLinkedPageIds(blocks).filter(id => id !== pageId);
    if (targetIds.length === 0) return;
    // Nur Ziele eintragen, die es wirklich gibt (sonst schlägt der Fremdschlüssel fehl)
    await db.query(
        `INSERT INTO page_links (source_page_id, target_page_id)
         SELECT $1, id FROM pages WHERE id = ANY($2::int[])
         ON CONFLICT DO NOTHING`,
        [pageId, targetIds],
    );
}

/**
 * Legt eine neue Seite an.
 * Hat sie eine Elternseite, bekommt diese am Ende einen Unterseiten-Block –
 * so taucht die neue Seite auch im Inhalt der Elternseite auf (wie in Orbit/Notion).
 */
export async function createPage(input: { parentId: number | null; title: string; icon?: string | null }): Promise<Page> {
    return withTransaction(async client => {
        const position = await nextPosition(client, input.parentId);
        const initialBlocks: Block[] = [{ id: createBlockId(), type: 'text', content: '' }];
        const created = await queryOne<PageRow>(
            `INSERT INTO pages (parent_id, title, icon, blocks, position)
             VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING *`,
            [input.parentId, input.title, input.icon ?? null, JSON.stringify(initialBlocks), position],
            client,
        );
        if (!created) throw new Error('Seite konnte nicht angelegt werden');

        if (input.parentId) {
            const subpageBlock: Block = { id: createBlockId(), type: 'subpage', content: '', pageId: created.id };
            await client.query(
                `UPDATE pages SET blocks = blocks || $2::jsonb, updated_at = now() WHERE id = $1`,
                [input.parentId, JSON.stringify([subpageBlock])],
            );
            await client.query(
                'INSERT INTO page_links (source_page_id, target_page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [input.parentId, created.id],
            );
        }
        return toPage(created);
    });
}

export interface PageChanges {
    title?: string;
    icon?: string | null;
    blocks?: Block[];
    isFavorite?: boolean;
    parentId?: number | null;
}

/** Ändert einzelne Felder einer Seite. Nicht angegebene Felder bleiben, wie sie sind. */
export async function updatePage(pageId: number, changes: PageChanges): Promise<Page | null> {
    return withTransaction(async client => {
        const assignments: string[] = [];
        const params: unknown[] = [pageId];
        const assign = (column: string, value: unknown, cast = '') => {
            params.push(value);
            assignments.push(`${column} = $${params.length}${cast}`);
        };

        if (changes.title !== undefined) assign('title', changes.title);
        if (changes.icon !== undefined) assign('icon', changes.icon);
        if (changes.isFavorite !== undefined) assign('is_favorite', changes.isFavorite);
        if (changes.blocks !== undefined) {
            assign('blocks', JSON.stringify(changes.blocks), '::jsonb');
            assign('content_text', blocksToPlainText(changes.blocks));
        }
        if (changes.parentId !== undefined) {
            assign('parent_id', changes.parentId);
            assign('position', await nextPosition(client, changes.parentId));
        }
        if (assignments.length === 0) return findPage(pageId);

        const row = await queryOne<PageRow>(
            `UPDATE pages SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
            params,
            client,
        );
        if (row && changes.blocks !== undefined) await replacePageLinks(client, pageId, changes.blocks);
        return row ? toPage(row) : null;
    });
}

/** Prüft, ob `candidateId` die Seite selbst oder eine ihrer Unterseiten ist (verhindert Schleifen beim Verschieben). */
export async function isSelfOrDescendant(pageId: number, candidateId: number): Promise<boolean> {
    const row = await queryOne<{ found: boolean }>(
        `WITH RECURSIVE tree AS (
             SELECT id FROM pages WHERE id = $1
             UNION ALL
             SELECT p.id FROM pages p JOIN tree ON p.parent_id = tree.id
         )
         SELECT EXISTS (SELECT 1 FROM tree WHERE id = $2) AS found`,
        [pageId, candidateId],
    );
    return Boolean(row?.found);
}

/** Setzt die Reihenfolge der Seiten innerhalb einer Ebene. */
export async function reorderPages(pageIds: number[]): Promise<void> {
    await withTransaction(async client => {
        for (const [index, pageId] of pageIds.entries()) {
            await client.query('UPDATE pages SET position = $2 WHERE id = $1', [pageId, index]);
        }
    });
}

/* ------------------------------------------------------------------ */
/*  Papierkorb                                                        */
/* ------------------------------------------------------------------ */

/** Verschiebt eine Seite samt Unterseiten in den Papierkorb (alle mit demselben Zeitstempel). */
export async function moveToTrash(pageId: number): Promise<void> {
    await queryRows(
        `WITH RECURSIVE tree AS (
             SELECT id FROM pages WHERE id = $1 AND deleted_at IS NULL
             UNION ALL
             SELECT p.id FROM pages p JOIN tree ON p.parent_id = tree.id WHERE p.deleted_at IS NULL
         )
         UPDATE pages SET deleted_at = now(), is_favorite = false WHERE id IN (SELECT id FROM tree)`,
        [pageId],
    );
}

/**
 * Holt eine Seite aus dem Papierkorb – mit allen Unterseiten, die zusammen mit ihr gelöscht wurden.
 * Liegt die Elternseite noch im Papierkorb, landet die Seite auf der obersten Ebene.
 */
export async function restoreFromTrash(pageId: number): Promise<void> {
    await withTransaction(async client => {
        const page = await queryOne<{ deleted_at: Date | null; parent_deleted: boolean }>(
            `SELECT p.deleted_at, coalesce(parent.deleted_at IS NOT NULL, false) AS parent_deleted
             FROM pages p LEFT JOIN pages parent ON parent.id = p.parent_id WHERE p.id = $1`,
            [pageId],
            client,
        );
        if (!page?.deleted_at) return;

        // Zeitstempel im SQL vergleichen: JS-Date hat nur Millisekunden, PostgreSQL Mikrosekunden
        await client.query(
            `WITH RECURSIVE tree AS (
                 SELECT id, deleted_at FROM pages WHERE id = $1
                 UNION ALL
                 SELECT p.id, p.deleted_at FROM pages p JOIN tree ON p.parent_id = tree.id
                 WHERE p.deleted_at = tree.deleted_at
             )
             UPDATE pages SET deleted_at = NULL WHERE id IN (SELECT id FROM tree)`,
            [pageId],
        );
        if (page.parent_deleted) {
            await client.query('UPDATE pages SET parent_id = NULL, position = $2 WHERE id = $1', [
                pageId,
                await nextPosition(client, null),
            ]);
        }
    });
}

/** Löscht eine Seite aus dem Papierkorb endgültig (Unterseiten per ON DELETE CASCADE). */
export async function deletePermanently(pageId: number): Promise<boolean> {
    const rows = await queryRows('DELETE FROM pages WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id', [pageId]);
    return rows.length > 0;
}

/**
 * Hängt Blöcke ans Ende einer Seite an (z. B. aus der Inbox).
 * Ein einzelner leerer Textblock am Seitenende wird dabei ersetzt.
 */
export async function appendBlocksToPage(pageId: number, newBlocks: Block[]): Promise<Page | null> {
    const page = await findPage(pageId);
    if (!page || page.deletedAt) return null;
    const existing = [...page.blocks];
    const lastBlock = existing[existing.length - 1];
    if (lastBlock && lastBlock.type === 'text' && lastBlock.content.trim() === '') existing.pop();
    return updatePage(pageId, { blocks: [...existing, ...newBlocks] });
}

/** Leert den Papierkorb von Seiten, die älter als `retentionDays` sind. */
export async function purgeOldTrash(retentionDays: number): Promise<number> {
    const rows = await queryRows(
        `DELETE FROM pages WHERE deleted_at < now() - make_interval(days => $1) RETURNING id`,
        [retentionDays],
    );
    return rows.length;
}
