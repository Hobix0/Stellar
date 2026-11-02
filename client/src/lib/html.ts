/** Maskiert Text, damit er sicher in HTML eingesetzt werden kann. */
export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

/** Reiner Text aus einem HTML-Schnipsel (über den Browser-Parser). */
export function htmlToText(html: string): string {
    const element = document.createElement('div');
    element.innerHTML = html;
    return element.textContent ?? '';
}

/** Ist der HTML-Inhalt eines Blocks leer? (ein einzelnes <br> zählt als leer) */
export function isEmptyHtml(html: string): boolean {
    return html.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/g, ' ').trim() === '';
}
