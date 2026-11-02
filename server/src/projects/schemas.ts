/* ==================================================================
   Stellar · Eingabe-Prüfung (zod) für Projekte, Aufgaben und Labels
   ================================================================== */

import { z } from 'zod';
import { COLOR_NAMES, PROJECT_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from '../../../shared/types';
import { idListSchema, optionalDateSchema, optionalIconSchema } from '../http/validation';

const colorSchema = z.enum(COLOR_NAMES);
const prioritySchema = z.number().int().refine(
    (value): value is (typeof TASK_PRIORITIES)[number] => (TASK_PRIORITIES as readonly number[]).includes(value),
    'Priorität 0–3 erwartet',
);

export const projectInputSchema = z.object({
    name: z.string().trim().min(1, 'Name fehlt').max(200).optional(),
    description: z.string().max(10_000).optional(),
    color: colorSchema.optional(),
    icon: optionalIconSchema,
    status: z.enum(PROJECT_STATUSES).optional(),
    startDate: optionalDateSchema,
    dueDate: optionalDateSchema,
    pageId: z.number().int().positive().nullable().optional(),
});

export const createProjectSchema = projectInputSchema.extend({
    name: z.string().trim().min(1, 'Name fehlt').max(200),
});

export const taskInputSchema = z.object({
    title: z.string().trim().min(1, 'Titel fehlt').max(500).optional(),
    description: z.string().max(50_000).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: prioritySchema.optional(),
    startDate: optionalDateSchema,
    dueDate: optionalDateSchema,
    pageId: z.number().int().positive().nullable().optional(),
    labelIds: idListSchema.optional(),
});

export const createTaskSchema = taskInputSchema.extend({
    title: z.string().trim().min(1, 'Titel fehlt').max(500),
});

export const reorderTasksSchema = z.object({
    status: z.enum(TASK_STATUSES),
    taskIds: idListSchema,
});

export const reorderProjectsSchema = z.object({ projectIds: idListSchema });

export const checklistItemSchema = z.object({
    text: z.string().trim().min(1).max(1000).optional(),
    done: z.boolean().optional(),
});

export const labelSchema = z.object({
    name: z.string().trim().min(1).max(60).optional(),
    color: colorSchema.optional(),
});
