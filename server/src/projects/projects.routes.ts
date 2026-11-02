/* ==================================================================
   Stellar · HTTP-Routen für Projekte, Aufgaben, Checklisten und Labels
   ================================================================== */

import { Router } from 'express';
import type { ProjectInput, TaskInput } from '../../../shared/types';
import { asyncHandler, HttpError, notFound } from '../http/errors';
import { isValidIsoDate, parseId } from '../http/validation';
import * as labelsRepository from './labels.repository';
import * as projectsRepository from './projects.repository';
import {
    checklistItemSchema,
    createProjectSchema,
    createTaskSchema,
    labelSchema,
    projectInputSchema,
    reorderProjectsSchema,
    reorderTasksSchema,
    taskInputSchema,
} from './schemas';
import * as tasksRepository from './tasks.repository';

/** Heute + `days` Tage als JJJJ-MM-TT (Zeitzone des Servers) */
function isoDateInDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function createProjectsRouter(): Router {
    const router = Router();

    /* ---------------- Projekte ---------------- */

    router.get('/projects', asyncHandler(async (_req, res) => {
        res.json(await projectsRepository.listProjects());
    }));

    router.post('/projects', asyncHandler(async (req, res) => {
        const input = createProjectSchema.parse(req.body);
        res.status(201).json(await projectsRepository.createProject(input as ProjectInput & { name: string }));
    }));

    router.post('/projects/reorder', asyncHandler(async (req, res) => {
        const { projectIds } = reorderProjectsSchema.parse(req.body);
        await projectsRepository.reorderProjects(projectIds);
        res.json({ ok: true });
    }));

    router.get('/projects/:projectId', asyncHandler(async (req, res) => {
        const project = await projectsRepository.findProject(parseId(req.params.projectId, 'Projekt-ID'));
        if (!project) throw notFound('Projekt');
        res.json(project);
    }));

    router.patch('/projects/:projectId', asyncHandler(async (req, res) => {
        const input = projectInputSchema.parse(req.body);
        const project = await projectsRepository.updateProject(parseId(req.params.projectId, 'Projekt-ID'), input as ProjectInput);
        if (!project) throw notFound('Projekt');
        res.json(project);
    }));

    router.delete('/projects/:projectId', asyncHandler(async (req, res) => {
        const deleted = await projectsRepository.deleteProject(parseId(req.params.projectId, 'Projekt-ID'));
        if (!deleted) throw notFound('Projekt');
        res.json({ ok: true });
    }));

    /* ---------------- Aufgaben ---------------- */

    router.get('/projects/:projectId/tasks', asyncHandler(async (req, res) => {
        res.json(await tasksRepository.listTasksOfProject(parseId(req.params.projectId, 'Projekt-ID')));
    }));

    router.post('/projects/:projectId/tasks', asyncHandler(async (req, res) => {
        const projectId = parseId(req.params.projectId, 'Projekt-ID');
        if (!(await projectsRepository.findProject(projectId))) throw notFound('Projekt');
        const input = createTaskSchema.parse(req.body);
        res.status(201).json(await tasksRepository.createTask(projectId, input as TaskInput & { title: string }));
    }));

    /** Board: Reihenfolge (und ggf. neuer Status) einer Spalte nach Drag & Drop */
    router.post('/projects/:projectId/tasks/reorder', asyncHandler(async (req, res) => {
        const { status, taskIds } = reorderTasksSchema.parse(req.body);
        await tasksRepository.reorderTasks(parseId(req.params.projectId, 'Projekt-ID'), status, taskIds);
        res.json({ ok: true });
    }));

    /** Offene Aufgaben, die in den nächsten 7 Tagen fällig (oder überfällig) sind */
    router.get('/tasks/upcoming', asyncHandler(async (_req, res) => {
        res.json(await tasksRepository.listUpcomingTasks(isoDateInDays(7)));
    }));

    /** Offene Aufgaben eines Tages: /api/tasks/due?date=2026-11-02 (heute inkl. überfälliger) */
    router.get('/tasks/due', asyncHandler(async (req, res) => {
        const date = String(req.query.date ?? '');
        if (!isValidIsoDate(date)) throw new HttpError(400, 'Datum im Format JJJJ-MM-TT erwartet');
        res.json(await tasksRepository.listOpenTasksDueOn(date, date === isoDateInDays(0)));
    }));

    router.get('/tasks/:taskId', asyncHandler(async (req, res) => {
        const task = await tasksRepository.findTaskDetail(parseId(req.params.taskId, 'Aufgaben-ID'));
        if (!task) throw notFound('Aufgabe');
        res.json(task);
    }));

    router.patch('/tasks/:taskId', asyncHandler(async (req, res) => {
        const input = taskInputSchema.parse(req.body);
        const task = await tasksRepository.updateTask(parseId(req.params.taskId, 'Aufgaben-ID'), input as TaskInput);
        if (!task) throw notFound('Aufgabe');
        res.json(task);
    }));

    router.delete('/tasks/:taskId', asyncHandler(async (req, res) => {
        const deleted = await tasksRepository.deleteTask(parseId(req.params.taskId, 'Aufgaben-ID'));
        if (!deleted) throw notFound('Aufgabe');
        res.json({ ok: true });
    }));

    /* ---------------- Checkliste ---------------- */

    router.post('/tasks/:taskId/checklist', asyncHandler(async (req, res) => {
        const taskId = parseId(req.params.taskId, 'Aufgaben-ID');
        const { text } = checklistItemSchema.required({ text: true }).parse(req.body);
        if (!(await tasksRepository.findTask(taskId))) throw notFound('Aufgabe');
        res.status(201).json(await tasksRepository.addChecklistItem(taskId, text));
    }));

    router.patch('/checklist/:itemId', asyncHandler(async (req, res) => {
        const item = await tasksRepository.updateChecklistItem(
            parseId(req.params.itemId, 'Eintrags-ID'),
            checklistItemSchema.parse(req.body),
        );
        if (!item) throw notFound('Checklisten-Eintrag');
        res.json(item);
    }));

    router.delete('/checklist/:itemId', asyncHandler(async (req, res) => {
        const deleted = await tasksRepository.deleteChecklistItem(parseId(req.params.itemId, 'Eintrags-ID'));
        if (!deleted) throw notFound('Checklisten-Eintrag');
        res.json({ ok: true });
    }));

    /* ---------------- Labels ---------------- */

    router.get('/labels', asyncHandler(async (_req, res) => {
        res.json(await labelsRepository.listLabels());
    }));

    router.post('/labels', asyncHandler(async (req, res) => {
        const { name, color } = labelSchema.required({ name: true }).parse(req.body);
        res.status(201).json(await labelsRepository.createLabel(name, color ?? 'gray'));
    }));

    router.patch('/labels/:labelId', asyncHandler(async (req, res) => {
        const label = await labelsRepository.updateLabel(parseId(req.params.labelId, 'Label-ID'), labelSchema.parse(req.body));
        if (!label) throw notFound('Label');
        res.json(label);
    }));

    router.delete('/labels/:labelId', asyncHandler(async (req, res) => {
        const deleted = await labelsRepository.deleteLabel(parseId(req.params.labelId, 'Label-ID'));
        if (!deleted) throw notFound('Label');
        res.json({ ok: true });
    }));

    return router;
}
