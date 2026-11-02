/* ==================================================================
   Stellar · Beschreibung aller Blocktypen
   Eine Stelle für Namen, Slash-Menü-Einträge, Platzhalter und
   Markdown-Kürzel. Neue Blocktypen hier und in shared/types.ts eintragen.
   ================================================================== */

import type { BlockType } from '../../../../../shared/types';

export interface BlockDefinition {
    type: BlockType;
    label: string;
    description: string;
    /** Kurzes Symbol im Slash-Menü */
    symbol: string;
    /** Zusätzliche Suchbegriffe fürs Slash-Menü */
    keywords: string[];
    /** Platzhalter für leere Blöcke dieses Typs */
    placeholder?: string;
    /** Block hat keinen eigenen Text (Trennlinie, Unterseite) */
    isAtomic?: boolean;
    /** Nach Enter entsteht ein Block desselben Typs (Listen, Aufgaben) */
    continuesOnEnter?: boolean;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
    { type: 'text', label: 'Text', description: 'Einfacher Absatz', symbol: '¶', keywords: ['absatz', 'paragraph'] },
    { type: 'heading1', label: 'Überschrift 1', description: 'Große Überschrift', symbol: 'H1', keywords: ['h1', 'titel'], placeholder: 'Überschrift 1' },
    { type: 'heading2', label: 'Überschrift 2', description: 'Mittlere Überschrift', symbol: 'H2', keywords: ['h2'], placeholder: 'Überschrift 2' },
    { type: 'heading3', label: 'Überschrift 3', description: 'Kleine Überschrift', symbol: 'H3', keywords: ['h3'], placeholder: 'Überschrift 3' },
    { type: 'bulletList', label: 'Aufzählung', description: 'Liste mit Punkten', symbol: '•', keywords: ['liste', 'bullet', 'ul'], placeholder: 'Listenpunkt', continuesOnEnter: true },
    { type: 'numberedList', label: 'Nummerierte Liste', description: 'Liste mit Zahlen', symbol: '1.', keywords: ['liste', 'nummer', 'ol'], placeholder: 'Listenpunkt', continuesOnEnter: true },
    { type: 'todo', label: 'Aufgabe', description: 'Punkt zum Abhaken', symbol: '☐', keywords: ['todo', 'checkbox', 'check'], placeholder: 'Aufgabe', continuesOnEnter: true },
    { type: 'quote', label: 'Zitat', description: 'Hervorgehobenes Zitat', symbol: '❝', keywords: ['quote', 'zitat'], placeholder: 'Zitat' },
    { type: 'callout', label: 'Hinweis', description: 'Kasten mit Emoji', symbol: '💡', keywords: ['callout', 'info', 'tipp'], placeholder: 'Hinweis' },
    { type: 'code', label: 'Code', description: 'Code-Block in Festbreitenschrift', symbol: '</>', keywords: ['code', 'snippet'], placeholder: 'Code' },
    { type: 'divider', label: 'Trennlinie', description: 'Horizontale Linie', symbol: '—', keywords: ['linie', 'hr', 'divider'], isAtomic: true },
    { type: 'subpage', label: 'Unterseite', description: 'Neue Seite in dieser Seite', symbol: '📄', keywords: ['seite', 'page'], isAtomic: true },
];

const DEFINITIONS_BY_TYPE = new Map(BLOCK_DEFINITIONS.map(definition => [definition.type, definition]));

export function getBlockDefinition(type: BlockType): BlockDefinition {
    return DEFINITIONS_BY_TYPE.get(type) ?? BLOCK_DEFINITIONS[0]!;
}

/** Filtert die Blocktypen fürs Slash-Menü nach dem eingegebenen Suchtext */
export function filterBlockDefinitions(query: string): BlockDefinition[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return BLOCK_DEFINITIONS;
    return BLOCK_DEFINITIONS.filter(
        definition =>
            definition.label.toLowerCase().includes(normalizedQuery) ||
            definition.keywords.some(keyword => keyword.startsWith(normalizedQuery)),
    );
}

/**
 * Markdown-Kürzel am Anfang eines Text-Blocks, ausgelöst durch das Leerzeichen danach.
 * Beispiel: „## “ → Überschrift 2
 */
export const MARKDOWN_SHORTCUTS: { prefix: string; type: BlockType }[] = [
    { prefix: '###', type: 'heading3' },
    { prefix: '##', type: 'heading2' },
    { prefix: '#', type: 'heading1' },
    { prefix: '-', type: 'bulletList' },
    { prefix: '*', type: 'bulletList' },
    { prefix: '1.', type: 'numberedList' },
    { prefix: '[]', type: 'todo' },
    { prefix: '[ ]', type: 'todo' },
    { prefix: '>', type: 'quote' },
    { prefix: '```', type: 'code' },
];

/** Prüft, ob der Text mit einem Markdown-Kürzel + Leerzeichen beginnt */
export function matchMarkdownShortcut(text: string): { type: BlockType; length: number } | null {
    for (const shortcut of MARKDOWN_SHORTCUTS) {
        const candidate = text.slice(0, shortcut.prefix.length + 1);
        if (candidate === `${shortcut.prefix} ` || candidate === `${shortcut.prefix} `) {
            return { type: shortcut.type, length: shortcut.prefix.length + 1 };
        }
    }
    return null;
}
