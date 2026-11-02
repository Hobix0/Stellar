/* ==================================================================
   Stellar · Gemeinsame Bausteine für die Prüfung von Eingaben (zod)
   ================================================================== */

import { z } from 'zod';
import { HttpError } from './errors';

/** Liest eine positive Ganzzahl-ID aus einem Routen-Parameter, z. B. /api/pages/:pageId */
export function parseId(value: string | undefined, what = 'ID'): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Ungültige ${what}`);
    return id;
}

/** Gibt es dieses Datum wirklich? ('2026-02-30' → false) */
export function isValidIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Datum im Format JJJJ-MM-TT */
export const isoDateSchema = z.string().refine(isValidIsoDate, 'Gültiges Datum im Format JJJJ-MM-TT erwartet');

/** Datum oder null (zum Leeren des Feldes) */
export const optionalDateSchema = isoDateSchema.nullable().optional();

/** Emoji oder kurzer Text als Icon; leerer Text = kein Icon */
export const optionalIconSchema = z
    .string()
    .max(16)
    .nullable()
    .optional()
    .transform(value => (value ? value : value === undefined ? undefined : null));

export const idListSchema = z.array(z.number().int().positive()).max(1000);
