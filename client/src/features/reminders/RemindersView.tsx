/* ==================================================================
   Stellar · Erinnerungen
   Anlegen (Text, Tag, Uhrzeit, Wiederholung), abhaken, löschen.
   Fällige Erinnerungen schickt der Server als Push über Home Assistant.
   ================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RECURRENCES, RECURRENCE_LABELS, type IntegrationStatus, type Recurrence, type Reminder } from '../../../../shared/types';
import { remindersApi } from '../../api/remindersApi';
import { Icon } from '../../components/ui/Icon';
import { formatRelativeTime } from '../../lib/dates';
import {
    REMINDER_GROUP_LABELS,
    formatReminderTime,
    groupOf,
    splitLocalDateTime,
    suggestedDateTime,
    type ReminderGroup,
} from './reminderFormat';

const GROUP_ORDER: ReminderGroup[] = ['overdue', 'today', 'week', 'later'];

interface FormState {
    text: string;
    date: string;
    time: string;
    recurrence: Recurrence;
}

function emptyForm(): FormState {
    return { text: '', ...suggestedDateTime(), recurrence: 'none' };
}

export function RemindersView() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<IntegrationStatus | null>(null);
    const [pushNotice, setPushNotice] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setReminders(await remindersApi.list(true));
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        document.title = 'Erinnerungen · Stellar';
        reload().catch(console.error);
        remindersApi.integrationStatus().then(setStatus).catch(console.error);
        // Liste regelmäßig auffrischen, damit erledigte/weitergerückte Termine stimmen
        const timer = setInterval(() => void reload().catch(console.error), 60_000);
        return () => clearInterval(timer);
    }, [reload]);

    const openReminders = reminders.filter(reminder => !reminder.doneAt);
    const doneReminders = reminders.filter(reminder => reminder.doneAt);

    const grouped = useMemo(() => {
        const groups = new Map<ReminderGroup, Reminder[]>();
        for (const reminder of openReminders) {
            const group = groupOf(reminder.dueAt);
            groups.set(group, [...(groups.get(group) ?? []), reminder]);
        }
        return groups;
    }, [openReminders]);

    const save = async () => {
        if (!form.text.trim() || !form.date || !form.time || isSaving) return;
        setIsSaving(true);
        try {
            const draft = { text: form.text.trim(), dueAt: `${form.date}T${form.time}`, recurrence: form.recurrence };
            if (editingId) await remindersApi.update(editingId, draft);
            else await remindersApi.create(draft);
            setForm(emptyForm());
            setEditingId(null);
            await reload();
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (reminder: Reminder) => {
        setEditingId(reminder.id);
        setForm({ text: reminder.text, ...splitLocalDateTime(reminder.dueAt), recurrence: reminder.recurrence });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const act = async (action: () => Promise<unknown>) => {
        try {
            await action();
            await reload();
        } catch (error) {
            alert((error as Error).message);
        }
    };

    const sendTestPush = async () => {
        setPushNotice('Sende …');
        try {
            await remindersApi.sendTestPush();
            setPushNotice('Test-Push gesendet – schau aufs Handy.');
        } catch (error) {
            setPushNotice((error as Error).message);
        }
    };

    return (
        <section className="content-narrow">
            <header className="view-header">
                <div>
                    <h1 className="view-title">Erinnerungen</h1>
                    <p className="view-subtitle">
                        {status?.pushConfigured
                            ? 'Kommen pünktlich als Push aufs Handy.'
                            : 'Push ist noch nicht eingerichtet – Erinnerungen erscheinen nur hier.'}
                    </p>
                </div>
                {status?.pushConfigured && (
                    <button className="button" onClick={() => void sendTestPush()}>
                        <Icon name="bell" size={16} /> Test-Push
                    </button>
                )}
            </header>

            {pushNotice && (
                <div className="banner banner-success">
                    <span>{pushNotice}</span>
                    <button className="button button-small button-ghost" onClick={() => setPushNotice(null)}>
                        OK
                    </button>
                </div>
            )}

            <form
                className="card reminder-form"
                onSubmit={event => {
                    event.preventDefault();
                    void save();
                }}
            >
                <input
                    className="input"
                    placeholder="Woran soll ich dich erinnern?"
                    value={form.text}
                    onChange={event => setForm({ ...form, text: event.target.value })}
                />
                <div className="reminder-form-row">
                    <input
                        className="input"
                        type="date"
                        aria-label="Tag"
                        value={form.date}
                        onChange={event => setForm({ ...form, date: event.target.value })}
                    />
                    <input
                        className="input"
                        type="time"
                        aria-label="Uhrzeit"
                        value={form.time}
                        onChange={event => setForm({ ...form, time: event.target.value })}
                    />
                    <select
                        className="input"
                        aria-label="Wiederholung"
                        value={form.recurrence}
                        onChange={event => setForm({ ...form, recurrence: event.target.value as Recurrence })}
                    >
                        {RECURRENCES.map(recurrence => (
                            <option key={recurrence} value={recurrence}>
                                {RECURRENCE_LABELS[recurrence]}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-actions">
                    {editingId && (
                        <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => {
                                setEditingId(null);
                                setForm(emptyForm());
                            }}
                        >
                            Abbrechen
                        </button>
                    )}
                    <button type="submit" className="button button-primary" disabled={!form.text.trim() || isSaving}>
                        {editingId ? 'Speichern' : 'Erinnern'}
                    </button>
                </div>
            </form>

            {!isLoaded && <p className="empty-state">Lädt …</p>}
            {isLoaded && openReminders.length === 0 && <p className="empty-state">Keine offenen Erinnerungen. 🌙</p>}

            {GROUP_ORDER.filter(group => grouped.has(group)).map(group => (
                <div key={group} className="reminder-group">
                    <h2 className="reminder-group-title">{REMINDER_GROUP_LABELS[group]}</h2>
                    {grouped.get(group)!.map(reminder => (
                        <ReminderRow
                            key={reminder.id}
                            reminder={reminder}
                            isOverdue={group === 'overdue'}
                            onComplete={() => void act(() => remindersApi.complete(reminder.id))}
                            onEdit={() => startEditing(reminder)}
                            onDelete={() => {
                                if (confirm(`Erinnerung „${reminder.text}“ löschen?`)) void act(() => remindersApi.remove(reminder.id));
                            }}
                        />
                    ))}
                </div>
            ))}

            {doneReminders.length > 0 && (
                <details className="reminder-done">
                    <summary>Erledigt ({doneReminders.length})</summary>
                    {doneReminders.map(reminder => (
                        <div key={reminder.id} className="reminder-row is-done">
                            <Icon name="check" size={16} />
                            <span className="reminder-text">{reminder.text}</span>
                            <span className="list-row-meta">{formatRelativeTime(reminder.doneAt!)}</span>
                            <button
                                className="icon-button"
                                title="Löschen"
                                onClick={() => void act(() => remindersApi.remove(reminder.id))}
                            >
                                <Icon name="trash" size={16} />
                            </button>
                        </div>
                    ))}
                </details>
            )}
        </section>
    );
}

interface ReminderRowProps {
    reminder: Reminder;
    isOverdue: boolean;
    onComplete: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function ReminderRow({ reminder, isOverdue, onComplete, onEdit, onDelete }: ReminderRowProps) {
    return (
        <div className={`reminder-row ${isOverdue ? 'is-overdue' : ''}`}>
            <button className="reminder-check" title={reminder.recurrence === 'none' ? 'Erledigt' : 'Erledigt – nächster Termin'} onClick={onComplete}>
                <Icon name="check" size={14} />
            </button>
            <button className="reminder-main" onClick={onEdit} title="Bearbeiten">
                <span className="reminder-text">{reminder.text}</span>
                <span className="reminder-meta">
                    {formatReminderTime(reminder.dueAt)}
                    {reminder.recurrence !== 'none' && <> · {RECURRENCE_LABELS[reminder.recurrence]}</>}
                </span>
            </button>
            <button className="icon-button" title="Löschen" onClick={onDelete}>
                <Icon name="trash" size={16} />
            </button>
        </div>
    );
}
