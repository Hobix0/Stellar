/* ==================================================================
   Stellar · Fehlerbehandlung für die HTTP-Routen
   ================================================================== */

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

/** Fehler mit HTTP-Statuscode, den die Fehler-Middleware als JSON an den Client gibt. */
export class HttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

export const notFound = (what: string) => new HttpError(404, `${what} nicht gefunden`);

/**
 * Express 4 fängt Fehler aus async-Funktionen nicht selbst.
 * Dieser Wrapper leitet abgelehnte Promises an die Fehler-Middleware weiter.
 */
export function asyncHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
}

/** Letzte Middleware: wandelt alle Fehler in eine einheitliche JSON-Antwort um. */
export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const field = firstIssue?.path.join('.') || 'Eingabe';
        res.status(400).json({ error: `Ungültige Eingabe (${field}): ${firstIssue?.message ?? ''}` });
        return;
    }
    console.error(error);
    res.status(500).json({ error: 'Interner Fehler' });
};
