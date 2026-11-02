/* ==================================================================
   Stellar · Volltextsuche über alle Wiki-Seiten
   Nutzt den PostgreSQL-Suchindex (tsvector, deutsche Wortstämme).
   Zusätzlich findet ein einfacher Teilwort-Vergleich auch Treffer
   mitten im Wort (z. B. „plan“ in „Wochenplanung“).
   ================================================================== */

import type { SearchResult } from '../../../shared/types';
import { queryRows } from '../db/pool';

/** Wandelt die Eingabe in eine Präfix-Suche um: „wochen pla“ → „wochen:* & pla:*“ */
function toPrefixQuery(searchText: string): string {
    return searchText
        .split(/\s+/)
        .map(word => word.replace(/[^\p{L}\p{N}]/gu, ''))
        .filter(Boolean)
        .map(word => `${word}:*`)
        .join(' & ');
}

/** Maskiert % und _ für LIKE-Vergleiche. */
function escapeLike(text: string): string {
    return text.replace(/[\\%_]/g, match => `\\${match}`);
}

// Seltene Zeichen als Markierung: erst den ganzen Ausschnitt maskieren, dann daraus <mark> machen.
// So kann Text aus den Seiten nie als HTML im Browser landen.
const MARK_START = '\u27E6';
const MARK_END = '\u27E7';

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function toSafeSnippet(rawSnippet: string): string {
    return escapeHtml(rawSnippet).split(MARK_START).join('<mark>').split(MARK_END).join('</mark>');
}

export async function searchPages(searchText: string, limit = 20): Promise<SearchResult[]> {
    const prefixQuery = toPrefixQuery(searchText);
    if (!prefixQuery) return [];

    const rows = await queryRows<SearchResult>(
        `SELECT id, title, icon,
                ts_headline('german', content_text, to_tsquery('german', $1),
                            'StartSel=${MARK_START}, StopSel=${MARK_END}, MaxFragments=1, MaxWords=18, MinWords=6') AS snippet
         FROM pages
         WHERE deleted_at IS NULL
           AND (search_vector @@ to_tsquery('german', $1) OR title ILIKE $2 OR content_text ILIKE $2)
         ORDER BY ts_rank(search_vector, to_tsquery('german', $1)) DESC, updated_at DESC
         LIMIT $3`,
        [prefixQuery, `%${escapeLike(searchText.trim())}%`, limit],
    );
    return rows.map(row => ({ ...row, snippet: toSafeSnippet(row.snippet) }));
}
