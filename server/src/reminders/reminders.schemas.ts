/* ==================================================================
   Stellar · Eingabe-Prüfung für Erinnerungen
   Zeitpunkte kommen als ISO-Text: mit Zeitzone ('2026-11-05T18:00:00+01:00')
   oder ohne ('2026-11-05T18:00' = Ortszeit des Servers).
   ================================================================== */

import { z } from 'zod';
import { RECURRENCES } from '../../../shared/types';

const LOCAL_OR_ZONED_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;

export const dateTimeSchema = z
    .string()
    .trim()
    .regex(LOCAL_OR_ZONED_DATE_TIME, 'Zeitpunkt im Format JJJJ-MM-TTTHH:MM erwartet')
    .transform((value, context) => {
        // Ohne Zeitzonen-Angabe liest JavaScript den Text als Ortszeit – genau das wollen wir
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: 'Ungültiger Zeitpunkt' });
            return z.NEVER;
        }
        return date;
    });

export const recurrenceSchema = z.enum(RECURRENCES);

export const createReminderSchema = z.object({
    text: z.string().trim().min(1, 'Text fehlt').max(2000),
    dueAt: dateTimeSchema,
    recurrence: recurrenceSchema.default('none'),
    taskId: z.number().int().positive().nullable().optional(),
});

export const updateReminderSchema = z.object({
    text: z.string().trim().min(1).max(2000).optional(),
    dueAt: dateTimeSchema.optional(),
    recurrence: recurrenceSchema.optional(),
    taskId: z.number().int().positive().nullable().optional(),
});
