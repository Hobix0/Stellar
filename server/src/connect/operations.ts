/* ==================================================================
   Stellar · Aktionen für Anbindungen von außen
   Eine Schicht für beides: die REST-Schnittstelle (/connect) und die
   MCP-Werkzeuge für Sprachassistent und Claude. So verhalten sich
   Home Assistant, Node-RED und Jarvis immer gleich.
   ================================================================== */

import type { Project, Recurrence, Reminder, Task, TaskPriority } from '../../../shared/types';
import { openDailyNote } from '../daily/daily.repository';
import { HttpError, notFound } from '../http/errors';
import { createInboxItem } from '../inbox/inbox.repository';
import { buildBriefing } from '../integrations/briefing.service';
import { localIsoDate } from '../integrations/time';
import { findProject, listProjects } from '../projects/projects.repository';
import { createTask, findTask, listOpenTasksDueOn, listTasksOfProject, listUpcomingTasks, updateTask } from '../projects/tasks.repository';
import * as remindersRepository from '../reminders/reminders.repository';
import { blocksToPlainText, plainTextToBlocks } from '../wiki/blocks';
import { appendBlocksToPage, findPage } from '../wiki/pages.repository';
import { searchPages } from '../wiki/search.repository';

export { buildBriefing };

const addDaysIso = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return localIsoDate(date);
};

/** Projekt per ID oder Name finden (Name: genau, sonst eindeutiger Teiltreffer, Groß/klein egal) */
export async function resolveProject(reference: string | number): Promise<Project> {
    const projects = await listProjects();
    const asNumber = Number(reference);
    if (Number.isInteger(asNumber) && asNumber > 0) {
        const byId = projects.find(project => project.id === asNumber);
        if (byId) return byId;
    }
    const wanted = String(reference).trim().toLowerCase();
    const exact = projects.filter(project => project.name.toLowerCase() === wanted);
    if (exact.length === 1) return exact[0]!;
    const partial = projects.filter(project => project.name.toLowerCase().includes(wanted));
    if (partial.length === 1) return partial[0]!;
    if (partial.length > 1) {
        throw new HttpError(409, `Mehrere Projekte passen zu „${reference}“: ${partial.map(project => project.name).join(', ')}`);
    }
    throw notFound(`Projekt „${reference}“`);
}

export async function captureToInbox(text: string) {
    return createInboxItem(text.trim());
}

/** Text unten an die Tagesnotiz hängen (Standard: heute) */
export async function appendToDailyNote(text: string, isoDate = localIsoDate(new Date())) {
    const page = await openDailyNote(isoDate);
    const updated = await appendBlocksToPage(page.id, plainTextToBlocks(text));
    if (!updated) throw new HttpError(404, 'Tagesnotiz nicht gefunden');
    return { pageId: page.id, date: isoDate };
}

export async function listActiveProjects(): Promise<Project[]> {
    return (await listProjects()).filter(project => project.status === 'active' || project.status === 'paused');
}

export type TaskScope = 'today' | 'upcoming' | 'project';

export async function listTasks(scope: TaskScope, projectReference?: string | number): Promise<Task[]> {
    if (scope === 'project') {
        if (projectReference === undefined) throw new HttpError(400, 'Projekt fehlt');
        const project = await resolveProject(projectReference);
        return (await listTasksOfProject(project.id)).filter(task => task.status !== 'done');
    }
    if (scope === 'today') return listOpenTasksDueOn(localIsoDate(new Date()), true);
    return listUpcomingTasks(addDaysIso(7));
}

export async function createTaskIn(input: {
    project: string | number;
    title: string;
    description?: string;
    dueDate?: string | null;
    priority?: TaskPriority;
}): Promise<{ task: Task; project: Project }> {
    const project = await resolveProject(input.project);
    const task = await createTask(project.id, {
        title: input.title.trim(),
        description: input.description ?? '',
        dueDate: input.dueDate ?? null,
        priority: input.priority ?? 0,
    });
    return { task, project };
}

export async function completeTask(taskId: number): Promise<Task> {
    if (!(await findTask(taskId))) throw notFound('Aufgabe');
    return (await updateTask(taskId, { status: 'done' }))!;
}

export async function createReminder(input: { text: string; dueAt: Date; recurrence?: Recurrence; taskId?: number | null }): Promise<Reminder> {
    if (input.taskId && !(await findTask(input.taskId))) throw notFound('Aufgabe');
    return remindersRepository.createReminder({ ...input, recurrence: input.recurrence ?? 'none' });
}

export async function completeReminder(reminderId: number): Promise<Reminder> {
    const reminder = await remindersRepository.completeReminder(reminderId);
    if (!reminder) throw notFound('Erinnerung');
    return reminder;
}

export async function deleteReminder(reminderId: number): Promise<void> {
    if (!(await remindersRepository.deleteReminder(reminderId))) throw notFound('Erinnerung');
}

export const listOpenReminders = () => remindersRepository.listReminders();

export const search = (query: string) => searchPages(query.slice(0, 200), 10);

/** Seite als reiner Text (für Sprachassistent und Claude) */
export async function readPageText(pageId: number) {
    const page = await findPage(pageId);
    if (!page || page.deletedAt) throw notFound('Seite');
    return { id: page.id, title: page.title || 'Ohne Titel', dailyDate: page.dailyDate, text: blocksToPlainText(page.blocks) };
}

/** Aufgabe kurz und lesbar, z. B. für Sprachausgabe */
export async function describeTasks(tasks: Task[]): Promise<string> {
    if (tasks.length === 0) return 'Keine offenen Aufgaben.';
    const projectNames = new Map((await listProjects()).map(project => [project.id, project.name]));
    return tasks
        .map(task => {
            const due = task.dueDate ? `, fällig ${task.dueDate}` : '';
            return `#${task.id} ${task.title} (${projectNames.get(task.projectId) ?? 'Projekt'}${due})`;
        })
        .join('\n');
}
