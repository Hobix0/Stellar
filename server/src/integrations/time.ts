/* ==================================================================
   Stellar · Zeit-Helfer in der Ortszeit des Servers (TZ)
   ================================================================== */

const pad = (value: number) => String(value).padStart(2, '0');

/** JS-Datum → JJJJ-MM-TT in Ortszeit */
export function localIsoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** JJJJ-MM-TT → Mitternacht in Ortszeit */
export function startOfLocalDay(isoDate: string): Date {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Uhrzeit 'HH:MM' an einem Tag → JS-Datum in Ortszeit */
export function localTimeOnDay(isoDate: string, time: string): Date {
    const date = startOfLocalDay(isoDate);
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    return date;
}

/** Jetzt als lesbarer Text mit Wochentag, z. B. für Sprachassistenten */
export function describeNow(now = new Date()): string {
    return now.toLocaleString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Jetzt als ISO in Ortszeit ohne Zeitzone: '2026-11-04T20:51' */
export function localIsoDateTime(now = new Date()): string {
    return `${localIsoDate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
