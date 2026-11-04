/* ==================================================================
   Stellar · Tagesübersicht (Briefing)
   Fällige und überfällige Aufgaben, Erinnerungen des Tages, Inbox-Stand
   und ausgewählte Zustände aus Home Assistant – als Daten und als Text.
   ================================================================== */

import type { Briefing, BriefingTask, Reminder, Task } from '../../../shared/types';
import { listInboxItems } from '../inbox/inbox.repository';
import { listProjects } from '../projects/projects.repository';
import { listOpenTasksDueOn } from '../projects/tasks.repository';
import { listOpenRemindersBetween } from '../reminders/reminders.repository';
import { readBriefingValues } from './homeAssistant';
import { localIsoDate, startOfLocalDay } from './time';

const MAX_TASKS_IN_TEXT = 5;

/** '2026-11-04' → 'Mittwoch, 4. November' */
export function formatDateLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Uhrzeit in Ortszeit: '19:00' */
export function formatLocalTime(isoDateTime: string): string {
    return new Date(isoDateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

const listing = (items: string[]) => {
    const shown = items.slice(0, MAX_TASKS_IN_TEXT);
    const rest = items.length - shown.length;
    return shown.join(', ') + (rest > 0 ? ` und ${rest} weitere` : '');
};

function composeText(briefing: Omit<Briefing, 'text'>): string {
    const lines: string[] = [];
    const { dueTodayTasks, overdueTasks, reminders, inboxCount, home } = briefing;

    if (dueTodayTasks.length > 0) {
        lines.push(`Heute fällig (${dueTodayTasks.length}): ${listing(dueTodayTasks.map(task => task.title))}`);
    }
    if (overdueTasks.length > 0) {
        lines.push(`Überfällig (${overdueTasks.length}): ${listing(overdueTasks.map(task => task.title))}`);
    }
    if (reminders.length > 0) {
        lines.push(`Erinnerungen: ${listing(reminders.map(reminder => `${formatLocalTime(reminder.dueAt)} ${reminder.text}`))}`);
    }
    if (dueTodayTasks.length === 0 && overdueTasks.length === 0 && reminders.length === 0) {
        lines.push('Keine fälligen Aufgaben und keine Erinnerungen – freier Tag im Kalender.');
    }
    if (inboxCount > 0) lines.push(`Inbox: ${inboxCount} ${inboxCount === 1 ? 'Eintrag' : 'Einträge'} zum Einsortieren`);
    if (home.length > 0) lines.push(home.map(value => `${value.name}: ${value.value}`).join(' · '));

    return lines.join('\n');
}

function toBriefingTask(task: Task, projectNames: Map<number, string>): BriefingTask {
    return {
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        projectName: projectNames.get(task.projectId) ?? '',
        dueDate: task.dueDate,
        priority: task.priority,
    };
}

/** Baut das Briefing für einen Tag (Standard: heute in der Zeitzone des Servers). */
export async function buildBriefing(isoDate = localIsoDate(new Date()), options: { withHome?: boolean } = {}): Promise<Briefing> {
    const isToday = isoDate === localIsoDate(new Date());
    const dayStart = startOfLocalDay(isoDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [tasks, projects, reminders, inboxItems, home] = await Promise.all([
        listOpenTasksDueOn(isoDate, isToday),
        listProjects(),
        listOpenRemindersBetween(isToday ? new Date(0) : dayStart, dayEnd),
        listInboxItems(),
        options.withHome === false ? Promise.resolve([]) : readBriefingValues().catch(() => []),
    ]);

    const projectNames = new Map(projects.map(project => [project.id, project.name]));
    const briefingTasks = tasks.map(task => toBriefingTask(task, projectNames));
    const data = {
        date: isoDate,
        dateLabel: formatDateLabel(isoDate),
        dueTodayTasks: briefingTasks.filter(task => task.dueDate === isoDate),
        overdueTasks: briefingTasks.filter(task => task.dueDate !== null && task.dueDate < isoDate),
        reminders: reminders as Reminder[],
        inboxCount: inboxItems.length,
        home,
    };
    return { ...data, text: composeText(data) };
}
