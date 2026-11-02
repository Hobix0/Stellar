/* ==================================================================
   Stellar · HTTP-Routen für die Inbox (/api/inbox)
   ================================================================== */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../http/errors';
import { isoDateSchema, parseId } from '../http/validation';
import * as inboxRepository from './inbox.repository';
import { moveInboxItem } from './inbox.service';

const inboxTextSchema = z.object({ text: z.string().trim().min(1, 'Text fehlt').max(20_000) });

const moveTargetSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('daily'), date: isoDateSchema }),
    z.object({ kind: z.literal('page'), pageId: z.number().int().positive() }),
    z.object({ kind: z.literal('task'), projectId: z.number().int().positive() }),
]);

export function createInboxRouter(): Router {
    const router = Router();

    router.get('/inbox', asyncHandler(async (_req, res) => {
        res.json(await inboxRepository.listInboxItems());
    }));

    router.post('/inbox', asyncHandler(async (req, res) => {
        const { text } = inboxTextSchema.parse(req.body);
        res.status(201).json(await inboxRepository.createInboxItem(text));
    }));

    router.patch('/inbox/:itemId', asyncHandler(async (req, res) => {
        const { text } = inboxTextSchema.parse(req.body);
        const item = await inboxRepository.updateInboxItem(parseId(req.params.itemId, 'Eintrags-ID'), text);
        if (!item) throw notFound('Inbox-Eintrag');
        res.json(item);
    }));

    router.delete('/inbox/:itemId', asyncHandler(async (req, res) => {
        const deleted = await inboxRepository.deleteInboxItem(parseId(req.params.itemId, 'Eintrags-ID'));
        if (!deleted) throw notFound('Inbox-Eintrag');
        res.json({ ok: true });
    }));

    /** Einsortieren: { kind: 'daily', date } | { kind: 'page', pageId } | { kind: 'task', projectId } */
    router.post('/inbox/:itemId/move', asyncHandler(async (req, res) => {
        const item = await inboxRepository.findInboxItem(parseId(req.params.itemId, 'Eintrags-ID'));
        if (!item) throw notFound('Inbox-Eintrag');
        res.json(await moveInboxItem(item, moveTargetSchema.parse(req.body)));
    }));

    return router;
}
