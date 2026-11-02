/* ==================================================================
   Stellar · Blöcke einer Wiki-Seite prüfen und auswerten
   - normalizeBlocks: bereinigt die Blöcke aus dem Client (nur erlaubtes HTML)
   - blocksToPlainText: reiner Text für die Volltextsuche
   - collectLinkedPageIds: alle Seiten, auf die verwiesen wird (für Rückverweise)
   ================================================================== */

import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { BLOCK_TYPES, type Block } from '../../../shared/types';

/** Erlaubtes Inline-HTML im Blockinhalt. Alles andere wird entfernt. */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'code', 'a', 'br', 'mark'],
    allowedAttributes: {
        // data-page-id + class="page-link" kennzeichnen interne Seitenlinks ([[…]])
        a: ['href', 'class', 'data-page-id', 'target', 'rel', 'contenteditable'],
    },
    allowedClasses: { a: ['page-link'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
};

const MAX_BLOCKS_PER_PAGE = 5000;

const blockSchema = z.object({
    id: z.string().min(1).max(64),
    type: z.enum(BLOCK_TYPES),
    content: z.string().max(200_000).default(''),
    checked: z.boolean().optional(),
    emoji: z.string().max(16).optional(),
    pageId: z.number().int().positive().optional(),
});

export const blocksSchema = z.array(blockSchema).max(MAX_BLOCKS_PER_PAGE);

/** Bereinigt eine Liste von Blöcken, die vom Client kommt. */
export function normalizeBlocks(input: z.infer<typeof blocksSchema>): Block[] {
    return input.map(block => {
        const normalized: Block = {
            id: block.id,
            type: block.type,
            content: sanitizeHtml(block.content, SANITIZE_OPTIONS),
        };
        if (block.type === 'todo') normalized.checked = Boolean(block.checked);
        if (block.type === 'callout') normalized.emoji = block.emoji || '💡';
        if (block.type === 'subpage' && block.pageId) normalized.pageId = block.pageId;
        return normalized;
    });
}

/** Ersetzt die wichtigsten HTML-Entities durch ihre Zeichen. */
function decodeEntities(text: string): string {
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

/** Wandelt HTML-Inhalt in reinen Text um (Zeilenumbrüche bleiben als Leerzeichen). */
export function htmlToPlainText(html: string): string {
    const withoutTags = html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
    return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/** Text aller Blöcke einer Seite – Grundlage der Volltextsuche. */
export function blocksToPlainText(blocks: Block[]): string {
    return blocks
        .map(block => htmlToPlainText(block.content))
        .filter(Boolean)
        .join('\n');
}

/** Sammelt alle Seiten-IDs, auf die eine Seite verweist: [[Links]] im Text und Unterseiten-Blöcke. */
export function collectLinkedPageIds(blocks: Block[]): number[] {
    const linkedIds = new Set<number>();
    const pageLinkPattern = /data-page-id="(\d+)"/g;
    for (const block of blocks) {
        if (block.type === 'subpage' && block.pageId) linkedIds.add(block.pageId);
        for (const match of block.content.matchAll(pageLinkPattern)) {
            linkedIds.add(Number(match[1]));
        }
    }
    return [...linkedIds];
}

/** Erzeugt eine zufällige Block-ID (gleiches Format wie im Client). */
export function createBlockId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Maskiert Text für HTML. */
function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

/** Macht aus Web-Adressen im (bereits maskierten) Text klickbare Links. */
function linkifyUrls(escapedText: string): string {
    return escapedText.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
}

/**
 * Wandelt reinen Text (z. B. einen Inbox-Eintrag) in Blöcke um:
 * jede nicht leere Zeile wird ein Textblock, Links werden klickbar.
 */
export function plainTextToBlocks(text: string): Block[] {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => ({ id: createBlockId(), type: 'text' as const, content: sanitizeHtml(linkifyUrls(escapeHtml(line)), SANITIZE_OPTIONS) }));
}
