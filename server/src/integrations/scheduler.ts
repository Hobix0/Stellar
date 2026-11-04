/* ==================================================================
   Stellar · Planer
   Läuft alle 30 Sekunden:
   1. fällige Erinnerungen als Push an Home Assistant
   2. einmal am Tag das Morgen-Briefing (Werktag/Wochenende getrennt einstellbar)
   Ohne eingerichteten Push werden Erinnerungen trotzdem weitergerückt,
   damit sie in der Oberfläche stimmen.
   ================================================================== */

import { config } from '../config';
import { getSettings, isPushConfigured } from '../settings/settings.service';
import { listDueUnnotified, markNotified, readAppState, writeAppState } from '../reminders/reminders.repository';
import { buildBriefing } from './briefing.service';
import { sendPush } from './homeAssistant';
import { localIsoDate, localTimeOnDay } from './time';

/** Schlägt der Push fehl, wird so lange erneut versucht – danach gilt die Erinnerung als gemeldet */
const PUSH_RETRY_WINDOW_MS = 15 * 60 * 1000;
/** Das Briefing kommt höchstens so lange nach der eingestellten Uhrzeit (z. B. nach einem Neustart) */
const BRIEFING_LATE_WINDOW_MS = 3 * 60 * 60 * 1000;
const BRIEFING_STATE_KEY = 'briefing_last_sent';

let isRunning = false;

async function deliverDueReminders(now: Date): Promise<void> {
    const dueReminders = await listDueUnnotified(now);
    for (const reminder of dueReminders) {
        if (isPushConfigured()) {
            try {
                await sendPush({ title: '⏰ Erinnerung', message: reminder.text, path: '/reminders', group: 'stellar-reminders' });
            } catch (error) {
                const overdueMs = now.getTime() - new Date(reminder.dueAt).getTime();
                console.error(`Push für Erinnerung ${reminder.id} fehlgeschlagen:`, (error as Error).message);
                if (overdueMs < PUSH_RETRY_WINDOW_MS) continue; // beim nächsten Durchlauf erneut versuchen
            }
        }
        await markNotified(reminder, now);
    }
}

function briefingTimeFor(now: Date): string | null {
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const settings = getSettings();
    return isWeekend ? settings.briefingWeekend : settings.briefingWeekday;
}

async function deliverMorningBriefing(now: Date): Promise<void> {
    if (!isPushConfigured()) return;
    const time = briefingTimeFor(now);
    if (!time) return;

    const today = localIsoDate(now);
    const scheduledAt = localTimeOnDay(today, time);
    const lateness = now.getTime() - scheduledAt.getTime();
    if (lateness < 0 || lateness > BRIEFING_LATE_WINDOW_MS) return;
    if ((await readAppState(BRIEFING_STATE_KEY)) === today) return;

    // Erst merken, dann senden: lieber ein Briefing verpassen als drei bekommen
    await writeAppState(BRIEFING_STATE_KEY, today);
    const briefing = await buildBriefing(today);
    const hour = now.getHours();
    const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
    await sendPush({
        title: `☀️ ${greeting} – ${briefing.dateLabel}`,
        message: briefing.text,
        path: '/',
        group: 'stellar-briefing',
    });
}

async function tick(): Promise<void> {
    if (isRunning) return;
    isRunning = true;
    const now = new Date();
    try {
        await deliverDueReminders(now);
        await deliverMorningBriefing(now);
    } catch (error) {
        console.error('Planer:', error);
    } finally {
        isRunning = false;
    }
}

/** Startet den Planer; gibt eine Funktion zum Anhalten zurück. */
export function startScheduler(): () => void {
    if (!isPushConfigured()) {
        console.log('Push an Home Assistant ist nicht eingerichtet – Erinnerungen erscheinen nur in Stellar.');
    }
    void tick();
    const timer = setInterval(() => void tick(), config.schedulerIntervalMs);
    return () => clearInterval(timer);
}
