/* ==================================================================
   Stellar · Datenzugriff für Aufgaben, ihre Labels und Checklisten
   ================================================================== */

import type { ChecklistItem, Task, TaskDetail, TaskInput, TaskStatus } from '../../../shared/types';
import { pool, queryOne, queryRows, withTransaction, type Queryable } from '../db/pool';
import { toChecklistItem, toTask, type ChecklistItemRow, type TaskRow } from './mappers';

/** Aufgaben-Spalten plus Label-IDs und Checklisten-Fortschritt */
const TASK_SELECT = `
    SELECT t.*,
           (SELECT array_agg(tl.label_id ORDER BY tl.label_id) FROM project_task_labels tl WHERE tl.task_id = t.id) AS label_ids,
           (SELECT count(*) FROM project_checklist_items c WHERE c.task_id = t.id) AS checklist_total,
           (SELECT count(*) FROM project_checklist_items c WHERE c.task_id = t.id AND c.done) AS checklist_done
    FROM project_tasks t`;

export async function listTasksOfProject(projectId: number): Promise<Task[]> {
    const rows = await queryRows<TaskRow>(`${TASK_SELECT} WHERE t.project_id = $1 ORDER BY t.position, t.id`, [projectId]);
    return rows.map(toTask);
}

/**
 * Offene Aufgaben mit Fälligkeit bis `untilDate` aus allen aktiven Projekten
 * (für die Startseite: überfällig, heute, demnächst).
 */
export async function listUpcomingTasks(untilDate: string): Promise<Task[]> {
    const rows = await queryRows<TaskRow>(
        `${TASK_SELECT}
         JOIN projects p ON p.id = t.project_id
         WHERE t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date <= $1 AND p.status = 'active'
         ORDER BY t.due_date, t.priority DESC LIMIT 50`,
        [untilDate],
    );
    return rows.map(toTask);
}

/**
 * Offene Aufgaben, die an einem Tag fällig sind (für die Tagesnotiz).
 * Mit `includeOverdue` kommen auch frühere, noch offene Fälligkeiten dazu (für „heute“).
 */
export async function listOpenTasksDueOn(isoDate: string, includeOverdue: boolean): Promise<Task[]> {
    const rows = await queryRows<TaskRow>(
        `${TASK_SELECT}
         JOIN projects p ON p.id = t.project_id
         WHERE t.status <> 'done' AND p.status IN ('active', 'paused')
           AND (t.due_date = $1 OR ($2 AND t.due_date < $1))
         ORDER BY t.due_date, t.priority DESC LIMIT 50`,
        [isoDate, includeOverdue],
    );
    return rows.map(toTask);
}

export async function findTask(taskId: number, db: Queryable = pool): Promise<Task | null> {
    const row = await queryOne<TaskRow>(`${TASK_SELECT} WHERE t.id = $1`, [taskId], db);
    return row ? toTask(row) : null;
}

export async function findTaskDetail(taskId: number): Promise<TaskDetail | null> {
    const task = await findTask(taskId);
    if (!task) return null;
    return { ...task, checklist: await listChecklist(taskId) };
}

/** Setzt die Labels einer Aufgabe neu. */
async function replaceTaskLabels(db: Queryable, taskId: number, labelIds: number[]): Promise<void> {
    await db.query('DELETE FROM project_task_labels WHERE task_id = $1', [taskId]);
    if (labelIds.length === 0) return;
    await db.query(
        `INSERT INTO project_task_labels (task_id, label_id)
         SELECT $1, id FROM project_labels WHERE id = ANY($2::int[])`,
        [taskId, labelIds],
    );
}

export async function createTask(projectId: number, input: TaskInput & { title: string }): Promise<Task> {
    const status: TaskStatus = input.status ?? 'todo';
    const taskId = await withTransaction(async client => {
        const created = await queryOne<{ id: number }>(
            `INSERT INTO project_tasks (project_id, title, description, status, priority, start_date, due_date, page_id, position, done_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                     (SELECT coalesce(max(position), -1) + 1 FROM project_tasks WHERE project_id = $1 AND status = $4),
                     CASE WHEN $4 = 'done' THEN now() END)
             RETURNING id`,
            [
                projectId,
                input.title,
                input.description ?? '',
                status,
                input.priority ?? 0,
                input.startDate ?? null,
                input.dueDate ?? null,
                input.pageId ?? null,
            ],
            client,
        );
        if (input.labelIds) await replaceTaskLabels(client, created!.id, input.labelIds);
        return created!.id;
    });
    return (await findTask(taskId))!;
}

/** Zuordnung API-Feld → Spalte (Labels werden extra behandelt) */
const TASK_COLUMNS: Record<Exclude<keyof TaskInput, 'labelIds'>, string> = {
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    startDate: 'start_date',
    dueDate: 'due_date',
    pageId: 'page_id',
};

export async function updateTask(taskId: number, changes: TaskInput): Promise<Task | null> {
    await withTransaction(async client => {
        const assignments: string[] = [];
        const params: unknown[] = [taskId];
        for (const [field, column] of Object.entries(TASK_COLUMNS) as [keyof typeof TASK_COLUMNS, string][]) {
            if (changes[field] === undefined) continue;
            params.push(changes[field]);
            assignments.push(`${column} = $${params.length}`);
        }
        if (changes.status !== undefined) {
            // Erledigt-Zeitpunkt merken bzw. beim Wiedereröffnen löschen.
            // Rechts von SET steht noch der alte Status, deshalb zählt hier der neue Wert aus den Parametern.
            params.push(changes.status);
            const newStatusParam = `$${params.length}`;
            assignments.push(`done_at = CASE WHEN ${newStatusParam} <> 'done' THEN NULL
                                             WHEN status = 'done' THEN done_at ELSE now() END`);
        }
        if (assignments.length > 0) {
            await client.query(`UPDATE project_tasks SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1`, params);
        }
        if (changes.labelIds !== undefined) await replaceTaskLabels(client, taskId, changes.labelIds);
    });
    return findTask(taskId);
}

export async function deleteTask(taskId: number): Promise<boolean> {
    const rows = await queryRows('DELETE FROM project_tasks WHERE id = $1 RETURNING id', [taskId]);
    return rows.length > 0;
}

/**
 * Speichert die Reihenfolge einer Board-Spalte.
 * Aufgaben, die aus einer anderen Spalte hierher gezogen wurden, bekommen dabei den neuen Status.
 */
export async function reorderTasks(projectId: number, status: TaskStatus, taskIds: number[]): Promise<void> {
    await withTransaction(async client => {
        for (const [index, taskId] of taskIds.entries()) {
            await client.query(
                `UPDATE project_tasks
                 SET position = $3,
                     done_at = CASE WHEN $4 <> 'done' THEN NULL WHEN status = 'done' THEN done_at ELSE now() END,
                     updated_at = CASE WHEN status <> $4 THEN now() ELSE updated_at END,
                     status = $4
                 WHERE id = $1 AND project_id = $2`,
                [taskId, projectId, index, status],
            );
        }
    });
}

/* ------------------------------------------------------------------ */
/*  Checkliste je Aufgabe                                             */
/* ------------------------------------------------------------------ */

export async function listChecklist(taskId: number): Promise<ChecklistItem[]> {
    const rows = await queryRows<ChecklistItemRow>(
        'SELECT * FROM project_checklist_items WHERE task_id = $1 ORDER BY position, id',
        [taskId],
    );
    return rows.map(toChecklistItem);
}

export async function addChecklistItem(taskId: number, text: string): Promise<ChecklistItem> {
    const row = await queryOne<ChecklistItemRow>(
        `INSERT INTO project_checklist_items (task_id, text, position)
         VALUES ($1, $2, (SELECT coalesce(max(position), -1) + 1 FROM project_checklist_items WHERE task_id = $1))
         RETURNING *`,
        [taskId, text],
    );
    return toChecklistItem(row!);
}

export async function updateChecklistItem(itemId: number, changes: { text?: string; done?: boolean }): Promise<ChecklistItem | null> {
    const row = await queryOne<ChecklistItemRow>(
        `UPDATE project_checklist_items
         SET text = coalesce($2, text), done = coalesce($3, done)
         WHERE id = $1 RETURNING *`,
        [itemId, changes.text ?? null, changes.done ?? null],
    );
    return row ? toChecklistItem(row) : null;
}

export async function deleteChecklistItem(itemId: number): Promise<boolean> {
    const rows = await queryRows('DELETE FROM project_checklist_items WHERE id = $1 RETURNING id', [itemId]);
    return rows.length > 0;
}
