/* ==================================================================
   Stellar · Express-App zusammensetzen
   /api/*   → JSON-Schnittstelle (Wiki, Projekte, Tagesnotizen, Inbox)
   /healthz → Lebenszeichen für Docker/Umbrel
   alles andere → gebautes React-Frontend (Single-Page-App)
   ================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { config } from './config';
import { createDailyRouter } from './daily/daily.routes';
import { pool } from './db/pool';
import { asyncHandler, errorMiddleware, HttpError } from './http/errors';
import { createInboxRouter } from './inbox/inbox.routes';
import { createProjectsRouter } from './projects/projects.routes';
import { createWikiRouter } from './wiki/pages.routes';

export function createApp(): Express {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '5mb' }));

    app.get('/healthz', asyncHandler(async (_req, res) => {
        await pool.query('SELECT 1');
        res.json({ ok: true });
    }));

    const api = express.Router();
    api.use(createWikiRouter());
    api.use(createProjectsRouter());
    api.use(createDailyRouter());
    api.use(createInboxRouter());
    // Unbekannte API-Pfade nicht ans Frontend durchreichen, sondern sauber mit 404 beantworten
    api.use((_req, _res, next) => next(new HttpError(404, 'Unbekannter API-Pfad')));
    app.use('/api', api);

    serveClient(app);
    app.use(errorMiddleware);
    return app;
}

/** Liefert das gebaute Frontend aus; jede unbekannte URL bekommt index.html (Routing im Browser). */
function serveClient(app: Express): void {
    const indexFile = path.join(config.clientDistDir, 'index.html');
    if (!fs.existsSync(indexFile)) {
        console.warn(`Kein gebautes Frontend unter ${config.clientDistDir} – im Dev-Modus übernimmt Vite.`);
        return;
    }
    app.use(express.static(config.clientDistDir, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(indexFile));
}
