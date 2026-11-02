/* ==================================================================
   Stellar · Hilfen für die Schreibmarke (Caret) in contentEditable-Blöcken
   Positionen sind Zeichen-Offsets im reinen Text des Blocks.
   ================================================================== */

/** Aktuelle Auswahl, wenn sie innerhalb von `element` liegt */
function selectionRangeIn(element: HTMLElement): Range | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    return element.contains(range.startContainer) ? range : null;
}

/** Zeichen-Offset der Schreibmarke im Block (oder null, wenn sie nicht dort steht) */
export function getCaretOffset(element: HTMLElement): number | null {
    const range = selectionRangeIn(element);
    if (!range) return null;
    const beforeCaret = document.createRange();
    beforeCaret.selectNodeContents(element);
    beforeCaret.setEnd(range.startContainer, range.startOffset);
    return beforeCaret.toString().length;
}

/** Text vom Blockanfang bis zur Schreibmarke */
export function getTextBeforeCaret(element: HTMLElement): string {
    const range = selectionRangeIn(element);
    if (!range) return '';
    const beforeCaret = document.createRange();
    beforeCaret.selectNodeContents(element);
    beforeCaret.setEnd(range.startContainer, range.startOffset);
    return beforeCaret.toString();
}

export function isSelectionCollapsed(): boolean {
    return window.getSelection()?.isCollapsed ?? true;
}

export function isCaretAtStart(element: HTMLElement): boolean {
    return isSelectionCollapsed() && getCaretOffset(element) === 0;
}

/** Findet Textknoten + Offset für einen Zeichen-Offset im Block */
function locateOffset(element: HTMLElement, offset: number): { node: Node; offset: number } {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    let node = walker.nextNode();
    while (node) {
        const length = node.textContent?.length ?? 0;
        if (remaining <= length) return { node, offset: remaining };
        remaining -= length;
        node = walker.nextNode();
    }
    // Hinter dem letzten Zeichen (oder leerer Block)
    return { node: element, offset: element.childNodes.length };
}

/** Erzeugt einen Bereich zwischen zwei Zeichen-Offsets im Block */
export function rangeBetweenOffsets(element: HTMLElement, start: number, end: number): Range {
    const range = document.createRange();
    const from = locateOffset(element, start);
    const to = locateOffset(element, end);
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    return range;
}

/** Setzt die Schreibmarke an einen Zeichen-Offset ('end' = ans Ende) und fokussiert den Block */
export function placeCaret(element: HTMLElement, offset: number | 'start' | 'end'): void {
    element.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    if (offset === 'end') {
        range.selectNodeContents(element);
        range.collapse(false);
    } else {
        const target = locateOffset(element, offset === 'start' ? 0 : offset);
        range.setStart(target.node, target.offset);
        range.collapse(true);
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * Schneidet alles ab der Schreibmarke aus dem Block heraus (für Enter = Block teilen).
 * Gibt den abgeschnittenen Teil als HTML zurück; der Block behält den Teil davor.
 */
export function extractHtmlAfterCaret(element: HTMLElement): string {
    const range = selectionRangeIn(element);
    if (!range) return '';
    range.deleteContents();
    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    tail.setEnd(element, element.childNodes.length);
    const container = document.createElement('div');
    container.appendChild(tail.extractContents());
    return container.innerHTML;
}

/** Steht die Schreibmarke in der ersten bzw. letzten Zeile des Blocks? (für Pfeil hoch/runter) */
export function isCaretOnEdgeLine(element: HTMLElement, edge: 'first' | 'last'): boolean {
    const range = selectionRangeIn(element);
    if (!range) return false;
    const caretRects = range.getClientRects();
    const caretRect = caretRects[0] ?? range.getBoundingClientRect();
    const blockRect = element.getBoundingClientRect();
    // Leerer Block oder Schreibmarke ohne Maße → zählt als erste und letzte Zeile
    if (!caretRect || (caretRect.top === 0 && caretRect.bottom === 0)) return true;
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 24;
    return edge === 'first'
        ? caretRect.top - blockRect.top < lineHeight * 0.8
        : blockRect.bottom - caretRect.bottom < lineHeight * 0.8;
}

/** Bildschirmposition der Schreibmarke (zum Anzeigen des Slash-Menüs) */
export function caretScreenPosition(element: HTMLElement): { left: number; top: number } {
    const range = selectionRangeIn(element);
    const rect = range?.getClientRects()[0] ?? element.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom + 6 };
}
