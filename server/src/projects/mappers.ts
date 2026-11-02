/* ==================================================================
   Stellar · Umwandlung von Datenbankzeilen (snake_case) in API-Objekte (camelCase)
   ================================================================== */

import type { ChecklistItem, ColorName, Label, Project, ProjectStatus, Task, TaskPriority, TaskStatus } from '../../../shared/types';

export interface ProjectRow {
    id: number;
    name: string;
    description: string;
    color: string;
    icon: string | null;
    status: string;
    start_date: string | null;
    due_date: string | null;
    page_id: number | null;
    position: number;
    created_at: Date;
    updated_at: Date;
    task_count: string | number;
    done_task_count: string | number;
}

export interface TaskRow {
    id: number;
    project_id: number;
    title: string;
    description: string;
    status: string;
    priority: number;
    start_date: string | null;
    due_date: string | null;
    page_id: number | null;
    position: number;
    created_at: Date;
    updated_at: Date;
    done_at: Date | null;
    label_ids: number[] | null;
    checklist_total: string | number;
    checklist_done: string | number;
}

export interface LabelRow {
    id: number;
    name: string;
    color: string;
}

export interface ChecklistItemRow {
    id: number;
    task_id: number;
    text: string;
    done: boolean;
    position: number;
}

export function toProject(row: ProjectRow): Project {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color as ColorName,
        icon: row.icon,
        status: row.status as ProjectStatus,
        startDate: row.start_date,
        dueDate: row.due_date,
        pageId: row.page_id,
        position: row.position,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        // COUNT() liefert in PostgreSQL bigint → kommt als Text an
        taskCount: Number(row.task_count),
        doneTaskCount: Number(row.done_task_count),
    };
}

export function toTask(row: TaskRow): Task {
    return {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: row.description,
        status: row.status as TaskStatus,
        priority: row.priority as TaskPriority,
        startDate: row.start_date,
        dueDate: row.due_date,
        pageId: row.page_id,
        position: row.position,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        doneAt: row.done_at ? row.done_at.toISOString() : null,
        labelIds: row.label_ids ?? [],
        checklistTotal: Number(row.checklist_total),
        checklistDone: Number(row.checklist_done),
    };
}

export function toLabel(row: LabelRow): Label {
    return { id: row.id, name: row.name, color: row.color as ColorName };
}

export function toChecklistItem(row: ChecklistItemRow): ChecklistItem {
    return { id: row.id, taskId: row.task_id, text: row.text, done: row.done, position: row.position };
}
