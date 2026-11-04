/* ==================================================================
   Stellar · Anzeige-Helfer für Erinnerungen
   ================================================================== */

import { addDays, toIsoDate, todayIsoDate } from '../../lib/dates';

const pad = (value: number) => String(value).padStart(2, '0');

/** ISO-Zeitpunkt → 'JJJJ-MM-TT' und 'HH:MM' in Ortszeit (für Formularfelder) */
export function splitLocalDateTime(isoDateTime: string): { date: string; time: string } {
    const date = new Date(isoDateTime);
    return { date: toIsoDate(date), time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
}

/** „Heute 19:00“, „Morgen 7:30“, „Fr., 7. Nov. 18:00“ */
export function formatReminderTime(isoDateTime: string): string {
    const { date, time } = splitLocalDateTime(isoDateTime);
    if (date === todayIsoDate()) return `Heute ${time}`;
    if (date === addDays(todayIsoDate(), 1)) return `Morgen ${time}`;
    if (date === addDays(todayIsoDate(), -1)) return `Gestern ${time}`;
    const label = new Date(isoDateTime).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${label} ${time}`;
}

export type ReminderGroup = 'overdue' | 'today' | 'week' | 'later';

export const REMINDER_GROUP_LABELS: Record<ReminderGroup, string> = {
    overdue: 'Verpasst',
    today: 'Heute',
    week: 'Nächste 7 Tage',
    later: 'Später',
};

export function groupOf(isoDateTime: string, now = new Date()): ReminderGroup {
    const due = new Date(isoDateTime);
    if (due < now) return 'overdue';
    const { date } = splitLocalDateTime(isoDateTime);
    if (date === todayIsoDate()) return 'today';
    if (date <= addDays(todayIsoDate(), 7)) return 'week';
    return 'later';
}

/** Vorschlag für eine neue Erinnerung: nächste volle Stunde */
export function suggestedDateTime(now = new Date()): { date: string; time: string } {
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return { date: toIsoDate(next), time: `${pad(next.getHours())}:00` };
}
