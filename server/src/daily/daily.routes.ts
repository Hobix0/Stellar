/* ==================================================================
   Stellar · HTTP-Routen für Tagesnotizen (/api/daily)
   ================================================================== */

import { Router } from 'express';
import { asyncHandler, HttpError } from '../http/errors';
import { isValidIsoDate } from '../http/validation';
import { listDailyDatesInMonth, openDailyNote } from './daily.repository';

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function createDailyRouter(): Router {
    const router = Router();

    /** Tage mit Tagesnotiz in einem Monat: /api/daily?month=2026-11 */
    router.get('/daily', asyncHandler(async (req, res) => {
        const month = String(req.query.month ?? '');
        if (!YEAR_MONTH_PATTERN.test(month)) throw new HttpError(400, 'Monat im Format JJJJ-MM erwartet');
        res.json(await listDailyDatesInMonth(month));
    }));

    /** Tagesnotiz öffnen (wird bei Bedarf angelegt): POST /api/daily/2026-11-02 */
    router.post('/daily/:date', asyncHandler(async (req, res) => {
        const date = req.params.date ?? '';
        if (!isValidIsoDate(date)) throw new HttpError(400, 'Ungültiges Datum');
        res.json(await openDailyNote(date));
    }));

    return router;
}
