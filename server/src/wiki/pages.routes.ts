/* ==================================================================
   Stellar · HTTP-Routen für das Wiki (/api/pages, /api/search)
   ================================================================== */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError, notFound } from '../http/errors';
import { idListSchema, optionalIconSchema, parseId } from '../http/validation';
import { blocksSchema, normalizeBlocks } from './blocks';
import * as pagesRepository from './pages.repository';
import { searchPages } from './search.repository';

const createPageSchema = z.object({
    parentId: z.number().int().positive().nullable().optional(),
    title: z.string().max(500).optional(),
    icon: optionalIconSchema,
});

const updatePageSchema = z.object({
    title: z.string().max(500).optional(),
    icon: optionalIconSchema,
    blocks: blocksSchema.optional(),
    isFavorite: z.boolean().optional(),
    parentId: z.number().int().positive().nullable().optional(),
});

const reorderPagesSchema = z.object({ pageIds: idListSchema });

export function createWikiRouter(): Router {
    const router = Router();

    /** Seitenbaum: alle Seiten außerhalb des Papierkorbs */
    router.get('/pages', asyncHandler(async (_req, res) => {
        res.json(await pagesRepository.listPages());
    }));

    router.get('/pages/recent', asyncHandler(async (_req, res) => {
        res.json(await pagesRepository.listRecentPages());
    }));

    router.get('/pages/trash', asyncHandler(async (_req, res) => {
        res.json(await pagesRepository.listTrashedPages());
    }));

    router.post('/pages', asyncHandler(async (req, res) => {
        const input = createPageSchema.parse(req.body ?? {});
        const parentId = input.parentId ?? null;
        if (parentId && !(await pagesRepository.findPage(parentId))) throw notFound('Elternseite');
        const page = await pagesRepository.createPage({ parentId, title: input.title ?? '', icon: input.icon });
        res.status(201).json(page);
    }));

    router.post('/pages/reorder', asyncHandler(async (req, res) => {
        const { pageIds } = reorderPagesSchema.parse(req.body);
        await pagesRepository.reorderPages(pageIds);
        res.json({ ok: true });
    }));

    router.get('/pages/:pageId', asyncHandler(async (req, res) => {
        const pageId = parseId(req.params.pageId, 'Seiten-ID');
        const page = await pagesRepository.findPage(pageId);
        if (!page) throw notFound('Seite');
        if (!page.deletedAt) await pagesRepository.markPageVisited(pageId);
        res.json(page);
    }));

    router.patch('/pages/:pageId', asyncHandler(async (req, res) => {
        const pageId = parseId(req.params.pageId, 'Seiten-ID');
        const input = updatePageSchema.parse(req.body);

        if (input.parentId) {
            // Eine Seite darf nicht in sich selbst oder eine ihrer Unterseiten verschoben werden
            if (await pagesRepository.isSelfOrDescendant(pageId, input.parentId)) {
                throw new HttpError(400, 'Eine Seite kann nicht in sich selbst verschoben werden');
            }
        }

        const page = await pagesRepository.updatePage(pageId, {
            title: input.title,
            icon: input.icon,
            isFavorite: input.isFavorite,
            parentId: input.parentId,
            blocks: input.blocks ? normalizeBlocks(input.blocks) : undefined,
        });
        if (!page) throw notFound('Seite');
        res.json(page);
    }));

    router.get('/pages/:pageId/backlinks', asyncHandler(async (req, res) => {
        res.json(await pagesRepository.listBacklinks(parseId(req.params.pageId, 'Seiten-ID')));
    }));

    /** In den Papierkorb */
    router.delete('/pages/:pageId', asyncHandler(async (req, res) => {
        await pagesRepository.moveToTrash(parseId(req.params.pageId, 'Seiten-ID'));
        res.json({ ok: true });
    }));

    router.post('/pages/:pageId/restore', asyncHandler(async (req, res) => {
        await pagesRepository.restoreFromTrash(parseId(req.params.pageId, 'Seiten-ID'));
        res.json({ ok: true });
    }));

    /** Endgültig löschen – nur für Seiten im Papierkorb */
    router.delete('/pages/:pageId/permanent', asyncHandler(async (req, res) => {
        const deleted = await pagesRepository.deletePermanently(parseId(req.params.pageId, 'Seiten-ID'));
        if (!deleted) throw new HttpError(400, 'Nur Seiten im Papierkorb können endgültig gelöscht werden');
        res.json({ ok: true });
    }));

    router.get('/search', asyncHandler(async (req, res) => {
        const searchText = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
        res.json(await searchPages(searchText));
    }));

    return router;
}
