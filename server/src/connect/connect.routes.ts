/* ==================================================================
   Stellar · Connect-API (/connect/*) für Home Assistant, Node-RED & Co.
   Jeder Aufruf braucht das API-Token (siehe auth.ts). In Umbrel ist nur
   dieser Pfad an der Umbrel-Anmeldung vorbei freigegeben.
   ================================================================== */

import { Router } from 'express';
import { z } from 'zod';
import { RECURRENCES } from '../../../shared/types';
import { asyncHandler } from '../http/errors';
import { isoDateSchema, parseId } from '../http/validation';
import { localIsoDate } from '../integrations/time';
import { dateTimeSchema } from '../reminders/reminders.schemas';
import { requireApiToken } from './auth';
import { createMcpRouter } from './mcp';
import * as operations from './operations';

const textSchema = z.object({ text: z.string().trim().min(1, 'Text fehlt').max(20_000) });

const dailySchema = textSchema.extend({ date: isoDateSchema.optional() });

const taskSchema = z.object({
    project: z.union([z.string().trim().min(1), z.number().int().positive()]),
    title: z.string().trim().min(1).max(500),
    description: z.string().max(10_000).optional(),
    dueDate: isoDateSchema.nullable().optional(),
    priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

const reminderSchema = z.object({
    text: z.string().trim().min(1).max(2000),
    dueAt: dateTimeSchema,
    recurrence: z.enum(RECURRENCES).default('none'),
    taskId: z.number().int().positive().nullable().optional(),
});

export function createConnectRouter(): Router {
    const router = Router();
    router.use(requireApiToken);

    router.get('/health', (_req, res) => {
        res.json({ ok: true, service: 'stellar', now: new Date().toISOString() });
    });

    /** Tagesübersicht: ?date=JJJJ-MM-TT (Standard: heute) */
    router.get('/briefing', asyncHandler(async (req, res) => {
        const date = req.query.date ? isoDateSchema.parse(req.query.date) : localIsoDate(new Date());
        res.json(await operations.buildBriefing(date));
    }));

    router.post('/inbox', asyncHandler(async (req, res) => {
        const { text } = textSchema.parse(req.body);
        res.status(201).json(await operations.captureToInbox(text));
    }));

    router.post('/daily', asyncHandler(async (req, res) => {
        const { text, date } = dailySchema.parse(req.body);
        res.status(201).json(await operations.appendToDailyNote(text, date));
    }));

    router.get('/projects', asyncHandler(async (_req, res) => {
        res.json(await operations.listActiveProjects());
    }));

    /** ?scope=today|upcoming|project&project=Name */
    router.get('/tasks', asyncHandler(async (req, res) => {
        const scope = z.enum(['today', 'upcoming', 'project']).default('upcoming').parse(req.query.scope);
        const project = typeof req.query.project === 'string' ? req.query.project : undefined;
        res.json(await operations.listTasks(scope, project));
    }));

    router.post('/tasks', asyncHandler(async (req, res) => {
        const input = taskSchema.parse(req.body);
        res.status(201).json(await operations.createTaskIn(input));
    }));

    router.post('/tasks/:taskId/done', asyncHandler(async (req, res) => {
        res.json(await operations.completeTask(parseId(req.params.taskId, 'Aufgaben-ID')));
    }));

    router.get('/reminders', asyncHandler(async (_req, res) => {
        res.json(await operations.listOpenReminders());
    }));

    router.post('/reminders', asyncHandler(async (req, res) => {
        res.status(201).json(await operations.createReminder(reminderSchema.parse(req.body)));
    }));

    router.post('/reminders/:reminderId/done', asyncHandler(async (req, res) => {
        res.json(await operations.completeReminder(parseId(req.params.reminderId, 'Erinnerungs-ID')));
    }));

    router.delete('/reminders/:reminderId', asyncHandler(async (req, res) => {
        await operations.deleteReminder(parseId(req.params.reminderId, 'Erinnerungs-ID'));
        res.json({ ok: true });
    }));

    router.get('/search', asyncHandler(async (req, res) => {
        res.json(await operations.search(typeof req.query.q === 'string' ? req.query.q : ''));
    }));

    router.get('/pages/:pageId', asyncHandler(async (req, res) => {
        res.json(await operations.readPageText(parseId(req.params.pageId, 'Seiten-ID')));
    }));

    router.use(createMcpRouter());
    return router;
}
