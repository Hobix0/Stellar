/* ==================================================================
   Stellar · Datums-Helfer (Anzeige auf Deutsch)
   Fälligkeiten kommen als 'JJJJ-MM-TT' ohne Uhrzeit vom Server.
   ================================================================== */

const pad = (value: number) => String(value).padStart(2, '0');

/** JS-Datum → JJJJ-MM-TT (lokale Zeitzone) */
export function toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** JJJJ-MM-TT → JS-Datum um Mitternacht (lokale Zeitzone) */
export function parseIsoDate(isoDate: string): Date {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Heutiges Datum als JJJJ-MM-TT in der Zeitzone des Browsers */
export function todayIsoDate(): string {
    return toIsoDate(new Date());
}

/** Verschiebt ein Datum um `days` Tage: addDays('2026-11-30', 1) → '2026-12-01' */
export function addDays(isoDate: string, days: number): string {
    const date = parseIsoDate(isoDate);
    date.setDate(date.getDate() + days);
    return toIsoDate(date);
}

/** Ist das Datum gültig (JJJJ-MM-TT und wirklich im Kalender)? */
export function isValidIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && toIsoDate(parseIsoDate(value)) === value;
}

/** '2026-11-02' → '2. Nov.' (im laufenden Jahr) bzw. '2. Nov. 2027' */
export function formatShortDate(isoDate: string): string {
    const date = parseIsoDate(isoDate);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' });
}

/** Ist die Fälligkeit vorbei (gestern oder früher)? */
export function isOverdue(isoDate: string | null): boolean {
    return Boolean(isoDate && isoDate < todayIsoDate());
}

export function isToday(isoDate: string | null): boolean {
    return isoDate === todayIsoDate();
}

/** Zeitpunkt (ISO mit Uhrzeit) als relative Angabe: „vor 5 Min.“, „gestern“ … */
export function formatRelativeTime(isoDateTime: string): string {
    const diffMinutes = Math.round((Date.now() - new Date(isoDateTime).getTime()) / 60_000);
    if (diffMinutes < 1) return 'gerade eben';
    if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return new Date(isoDateTime).toLocaleDateString('de-DE');
}
