/* ==================================================================
   Stellar · Datenzugriff für Erinnerungen
   ================================================================== */

import type { Recurrence, Reminder } from '../../../shared/types';
import { queryOne, queryRows } from '../db/pool';
import { alignToRecurrence, nextOccurrence } from './recurrence';

interface ReminderRow {
    id: number;
    text: string;
    due_at: Date;
    recurrence: Recurrence;
    task_id: number | null;
    notified_at: Date | null;
    done_at: Date | null;
    created_at: Date;
}

const toIso = (value: Date | null) => (value ? value.toISOString() : null);

function toReminder(row: ReminderRow): Reminder {
    return {
        id: row.id,
        text: row.text,
        dueAt: row.due_at.toISOString(),
        recurrence: row.recurrence,
        taskId: row.task_id,
        notifiedAt: toIso(row.notified_at),
        doneAt: toIso(row.done_at),
        createdAt: row.created_at.toISOString(),
    };
}

/** Offene zuerst (nach Fälligkeit), danach die zuletzt erledigten */
export async function listReminders(options: { includeDone?: boolean } = {}): Promise<Reminder[]> {
    const rows = await queryRows<ReminderRow>(
        options.includeDone
            ? `(SELECT * FROM reminders WHERE done_at IS NULL ORDER BY due_at)
               UNION ALL
               (SELECT * FROM reminders WHERE done_at IS NOT NULL ORDER BY done_at DESC LIMIT 30)`
            : 'SELECT * FROM reminders WHERE done_at IS NULL ORDER BY due_at',
    );
    return rows.map(toReminder);
}

/** Offene Erinnerungen in einem Zeitraum [from, until) */
export async function listOpenRemindersBetween(from: Date, until: Date): Promise<Reminder[]> {
    const rows = await queryRows<ReminderRow>(
        'SELECT * FROM reminders WHERE done_at IS NULL AND due_at >= $1 AND due_at < $2 ORDER BY due_at',
        [from, until],
    );
    return rows.map(toReminder);
}

export async function findReminder(reminderId: number): Promise<Reminder | null> {
    const row = await queryOne<ReminderRow>('SELECT * FROM reminders WHERE id = $1', [reminderId]);
    return row ? toReminder(row) : null;
}

export async function createReminder(input: {
    text: string;
    dueAt: Date;
    recurrence: Recurrence;
    taskId?: number | null;
}): Promise<Reminder> {
    const row = await queryOne<ReminderRow>(
        `INSERT INTO reminders (text, due_at, recurrence, task_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [input.text, alignToRecurrence(input.dueAt, input.recurrence), input.recurrence, input.taskId ?? null],
    );
    return toReminder(row!);
}

export async function updateReminder(
    reminderId: number,
    changes: { text?: string; dueAt?: Date; recurrence?: Recurrence; taskId?: number | null },
): Promise<Reminder | null> {
    const current = await findReminder(reminderId);
    if (!current) return null;
    const recurrence = changes.recurrence ?? current.recurrence;
    const dueAt = changes.dueAt ? alignToRecurrence(changes.dueAt, recurrence) : new Date(current.dueAt);
    const row = await queryOne<ReminderRow>(
        `UPDATE reminders
         SET text = $2, due_at = $3, recurrence = $4, task_id = $5,
             -- Neuer Zeitpunkt = wieder offen und noch nicht benachrichtigt
             notified_at = CASE WHEN $3 <> due_at THEN NULL ELSE notified_at END,
             done_at = CASE WHEN $3 <> due_at THEN NULL ELSE done_at END,
             updated_at = now()
         WHERE id = $1 RETURNING *`,
        [
            reminderId,
            changes.text ?? current.text,
            dueAt,
            recurrence,
            changes.taskId === undefined ? current.taskId : changes.taskId,
        ],
    );
    return row ? toReminder(row) : null;
}

export async function deleteReminder(reminderId: number): Promise<boolean> {
    const rows = await queryRows('DELETE FROM reminders WHERE id = $1 RETURNING id', [reminderId]);
    return rows.length > 0;
}

/**
 * Abhaken: einmalige Erinnerungen sind danach erledigt,
 * wiederkehrende rücken auf den nächsten Termin.
 */
export async function completeReminder(reminderId: number, now = new Date()): Promise<Reminder | null> {
    const current = await findReminder(reminderId);
    if (!current) return null;
    const next = nextOccurrence(new Date(current.dueAt), current.recurrence, now);
    const row = next
        ? await queryOne<ReminderRow>(
              `UPDATE reminders SET due_at = $2, notified_at = NULL, updated_at = now() WHERE id = $1 RETURNING *`,
              [reminderId, next],
          )
        : await queryOne<ReminderRow>(
              `UPDATE reminders SET done_at = now(), updated_at = now() WHERE id = $1 RETURNING *`,
              [reminderId],
          );
    return row ? toReminder(row) : null;
}

/** Fällige, noch nicht gemeldete Erinnerungen (für den Planer) */
export async function listDueUnnotified(now: Date): Promise<Reminder[]> {
    const rows = await queryRows<ReminderRow>(
        `SELECT * FROM reminders
         WHERE done_at IS NULL AND notified_at IS NULL AND due_at <= $1
         ORDER BY due_at LIMIT 50`,
        [now],
    );
    return rows.map(toReminder);
}

/**
 * Nach der Benachrichtigung: einmalige gelten als erledigt,
 * wiederkehrende rücken auf den nächsten Termin nach `now`.
 */
export async function markNotified(reminder: Reminder, now: Date): Promise<void> {
    const next = nextOccurrence(new Date(reminder.dueAt), reminder.recurrence, now);
    if (next) {
        await queryRows('UPDATE reminders SET due_at = $2, notified_at = NULL, updated_at = now() WHERE id = $1', [
            reminder.id,
            next,
        ]);
    } else {
        await queryRows('UPDATE reminders SET notified_at = $2, done_at = $2, updated_at = now() WHERE id = $1', [
            reminder.id,
            now,
        ]);
    }
}

/* ---------------- kleine Schlüssel/Wert-Ablage ---------------- */

export async function readAppState(key: string): Promise<string | null> {
    const row = await queryOne<{ value: string }>('SELECT value FROM app_state WHERE key = $1', [key]);
    return row?.value ?? null;
}

export async function writeAppState(key: string, value: string): Promise<void> {
    await queryRows(
        `INSERT INTO app_state (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value],
    );
}
