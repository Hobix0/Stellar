/* ==================================================================
   Stellar · Routen für die Oberfläche: Briefing, Status der Anbindungen,
   Test-Push. Laufen unter /api (hinter der Umbrel-Anmeldung).
   ================================================================== */

import { Router } from 'express';
import type { IntegrationStatus } from '../../../shared/types';
import { getSettings, isPushConfigured } from '../settings/settings.service';
import { asyncHandler, HttpError } from '../http/errors';
import { isoDateSchema } from '../http/validation';
import { buildBriefing } from './briefing.service';
import { sendPush } from './homeAssistant';
import { localIsoDate } from './time';

export function createIntegrationsRouter(): Router {
    const router = Router();

    router.get('/briefing', asyncHandler(async (req, res) => {
        const date = req.query.date ? isoDateSchema.parse(req.query.date) : localIsoDate(new Date());
        // Für die Startseite ohne Home-Assistant-Werte: schneller und ohne Abhängigkeit
        res.json(await buildBriefing(date, { withHome: req.query.home === '1' }));
    }));

    router.get('/integrations/status', (_req, res) => {
        const settings = getSettings();
        const status: IntegrationStatus = {
            pushConfigured: isPushConfigured(),
            connectApiEnabled: Boolean(settings.apiToken),
            briefingTimes: { weekday: settings.briefingWeekday, weekend: settings.briefingWeekend },
            timeZone: settings.timeZone,
        };
        res.json(status);
    });

    router.post('/integrations/test-push', asyncHandler(async (_req, res) => {
        if (!isPushConfigured()) throw new HttpError(400, 'Push ist nicht eingerichtet – Home Assistant in den Einstellungen eintragen');
        try {
            await sendPush({ title: '✨ Stellar', message: 'Test-Push – die Verbindung zu Home Assistant steht.', path: '/reminders' });
        } catch (error) {
            throw new HttpError(502, (error as Error).message);
        }
        res.json({ ok: true });
    }));

    return router;
}
