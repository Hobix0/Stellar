/* ==================================================================
   Stellar · HTTP-Routen für die Einstellungen (/api/settings)
   Hinter der Umbrel-Anmeldung – deshalb darf das API-Token hier
   im Klartext stehen (man muss es ja kopieren können).
   ================================================================== */

import { Router } from 'express';
import { z } from 'zod';
import type { SettingsView } from '../../../shared/types';
import { asyncHandler, HttpError } from '../http/errors';
import { getSettings, lockedSettings, regenerateApiToken, updateSettings } from './settings.service';

const timeOrOff = z
    .string()
    .trim()
    .regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Uhrzeit HH:MM oder leer')
    .nullable()
    .optional();

const isValidTimeZone = (timeZone: string) => {
    try {
        new Intl.DateTimeFormat('de-DE', { timeZone });
        return true;
    } catch {
        return false;
    }
};

const settingsInputSchema = z.object({
    timeZone: z.string().trim().max(64).refine(isValidTimeZone, 'Unbekannte Zeitzone, z. B. Europe/Berlin').optional(),
    publicUrl: z.string().trim().max(300).refine(value => value === '' || /^https?:\/\//.test(value), 'Adresse mit http:// oder https://').optional(),
    haUrl: z.string().trim().max(300).refine(value => value === '' || /^https?:\/\//.test(value), 'Adresse mit http:// oder https://').optional(),
    haToken: z.string().max(1000).optional(),
    haNotifyService: z.string().trim().max(200).regex(/^(notify\.)?[a-z0-9_]*$/, 'z. B. mobile_app_iphone_von_luca').optional(),
    haBriefingEntities: z.string().max(2000).optional(),
    briefingWeekday: timeOrOff,
    briefingWeekend: timeOrOff,
});

function toView(): SettingsView {
    const settings = getSettings();
    return {
        apiToken: settings.apiToken,
        timeZone: settings.timeZone,
        publicUrl: settings.publicUrl,
        haUrl: settings.haUrl,
        haTokenSet: Boolean(settings.haToken),
        haNotifyService: settings.haNotifyService,
        haBriefingEntities: settings.haBriefingEntities.join(', '),
        briefingWeekday: settings.briefingWeekday,
        briefingWeekend: settings.briefingWeekend,
        locked: lockedSettings,
    };
}

export function createSettingsRouter(): Router {
    const router = Router();

    router.get('/settings', (_req, res) => {
        res.json(toView());
    });

    router.patch('/settings', asyncHandler(async (req, res) => {
        const input = settingsInputSchema.parse(req.body);
        const lockedChanges = Object.keys(input).filter(key => (lockedSettings as string[]).includes(key));
        if (lockedChanges.length > 0) {
            throw new HttpError(400, `Per Umgebungsvariable festgelegt: ${lockedChanges.join(', ')}`);
        }
        await updateSettings(input);
        res.json(toView());
    }));

    router.post('/settings/regenerate-token', asyncHandler(async (_req, res) => {
        if (lockedSettings.includes('apiToken')) throw new HttpError(400, 'Token ist per STELLAR_API_TOKEN festgelegt');
        await regenerateApiToken();
        res.json(toView());
    }));

    return router;
}
