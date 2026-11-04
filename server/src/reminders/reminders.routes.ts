/* ==================================================================
   Stellar · HTTP-Routen für Erinnerungen (/api/reminders)
   ================================================================== */

import { Router } from 'express';
import { asyncHandler, notFound } from '../http/errors';
import { parseId } from '../http/validation';
import { findTask } from '../projects/tasks.repository';
import * as remindersRepository from './reminders.repository';
import { createReminderSchema, updateReminderSchema } from './reminders.schemas';

async function assertTaskExists(taskId: number | null | undefined): Promise<void> {
    if (taskId && !(await findTask(taskId))) throw notFound('Aufgabe');
}

export function createRemindersRouter(): Router {
    const router = Router();

    /** Offene Erinnerungen; mit ?includeDone=1 auch die zuletzt erledigten */
    router.get('/reminders', asyncHandler(async (req, res) => {
        const includeDone = req.query.includeDone === '1' || req.query.includeDone === 'true';
        res.json(await remindersRepository.listReminders({ includeDone }));
    }));

    router.post('/reminders', asyncHandler(async (req, res) => {
        const input = createReminderSchema.parse(req.body);
        await assertTaskExists(input.taskId);
        res.status(201).json(await remindersRepository.createReminder(input));
    }));

    router.patch('/reminders/:reminderId', asyncHandler(async (req, res) => {
        const input = updateReminderSchema.parse(req.body);
        await assertTaskExists(input.taskId);
        const reminder = await remindersRepository.updateReminder(parseId(req.params.reminderId, 'Erinnerungs-ID'), input);
        if (!reminder) throw notFound('Erinnerung');
        res.json(reminder);
    }));

    /** Abhaken: einmalig → erledigt, wiederkehrend → nächster Termin */
    router.post('/reminders/:reminderId/done', asyncHandler(async (req, res) => {
        const reminder = await remindersRepository.completeReminder(parseId(req.params.reminderId, 'Erinnerungs-ID'));
        if (!reminder) throw notFound('Erinnerung');
        res.json(reminder);
    }));

    router.delete('/reminders/:reminderId', asyncHandler(async (req, res) => {
        const deleted = await remindersRepository.deleteReminder(parseId(req.params.reminderId, 'Erinnerungs-ID'));
        if (!deleted) throw notFound('Erinnerung');
        res.json({ ok: true });
    }));

    return router;
}
