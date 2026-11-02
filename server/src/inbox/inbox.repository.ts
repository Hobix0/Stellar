/* ==================================================================
   Stellar · Datenzugriff für die Inbox
   ================================================================== */

import type { InboxItem } from '../../../shared/types';
import { queryOne, queryRows } from '../db/pool';

interface InboxItemRow {
    id: number;
    text: string;
    created_at: Date;
}

function toInboxItem(row: InboxItemRow): InboxItem {
    return { id: row.id, text: row.text, createdAt: row.created_at.toISOString() };
}

/** Neueste Einträge zuerst */
export async function listInboxItems(): Promise<InboxItem[]> {
    const rows = await queryRows<InboxItemRow>('SELECT * FROM inbox_items ORDER BY created_at DESC, id DESC');
    return rows.map(toInboxItem);
}

export async function findInboxItem(itemId: number): Promise<InboxItem | null> {
    const row = await queryOne<InboxItemRow>('SELECT * FROM inbox_items WHERE id = $1', [itemId]);
    return row ? toInboxItem(row) : null;
}

export async function createInboxItem(text: string): Promise<InboxItem> {
    const row = await queryOne<InboxItemRow>('INSERT INTO inbox_items (text) VALUES ($1) RETURNING *', [text]);
    return toInboxItem(row!);
}

export async function updateInboxItem(itemId: number, text: string): Promise<InboxItem | null> {
    const row = await queryOne<InboxItemRow>('UPDATE inbox_items SET text = $2 WHERE id = $1 RETURNING *', [itemId, text]);
    return row ? toInboxItem(row) : null;
}

export async function deleteInboxItem(itemId: number): Promise<boolean> {
    const rows = await queryRows('DELETE FROM inbox_items WHERE id = $1 RETURNING id', [itemId]);
    return rows.length > 0;
}
