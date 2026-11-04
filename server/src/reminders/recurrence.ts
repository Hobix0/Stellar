/* ==================================================================
   Stellar · Wiederkehrende Erinnerungen weiterrücken
   Gerechnet wird in der lokalen Zeitzone des Servers (TZ), damit
   „täglich 7:00“ auch nach der Zeitumstellung um 7:00 bleibt.
   ================================================================== */

import type { Recurrence } from '../../../shared/types';

/** Höchstzahl an Schritten – schützt vor Endlosschleifen bei uralten Terminen */
const MAX_STEPS = 5000;

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

/** Ein Schritt weiter; `anchorDay` hält bei „monatlich“ den ursprünglichen Tag (31. → 30. → 31.) */
function step(date: Date, recurrence: Exclude<Recurrence, 'none'>, anchorDay: number): Date {
    const next = new Date(date);
    switch (recurrence) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            return next;
        case 'weekdays':
            do next.setDate(next.getDate() + 1);
            while (isWeekend(next));
            return next;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            return next;
        case 'monthly': {
            // Erst auf den 1. setzen, sonst springt 31. Januar + 1 Monat in den März
            next.setDate(1);
            next.setMonth(next.getMonth() + 1);
            next.setDate(Math.min(anchorDay, daysInMonth(next.getFullYear(), next.getMonth())));
            return next;
        }
    }
}

/**
 * Nächster Termin nach `after`. Verpasste Termine (z. B. Server war aus) werden übersprungen,
 * damit nach einem Neustart nicht zehn alte Erinnerungen auf einmal kommen.
 * Gibt `null` zurück, wenn sich nichts wiederholt.
 */
export function nextOccurrence(dueAt: Date, recurrence: Recurrence, after: Date): Date | null {
    if (recurrence === 'none') return null;
    const anchorDay = dueAt.getDate();
    let next = step(dueAt, recurrence, anchorDay);
    for (let steps = 0; next <= after && steps < MAX_STEPS; steps++) {
        next = step(next, recurrence, anchorDay);
    }
    return next;
}

/** Bringt einen ersten Termin für „werktags“ auf einen Werktag (Sa/So → Montag). */
export function alignToRecurrence(dueAt: Date, recurrence: Recurrence): Date {
    if (recurrence !== 'weekdays' || !isWeekend(dueAt)) return dueAt;
    const aligned = new Date(dueAt);
    while (isWeekend(aligned)) aligned.setDate(aligned.getDate() + 1);
    return aligned;
}
