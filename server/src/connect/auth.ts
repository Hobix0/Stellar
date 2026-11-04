/* ==================================================================
   Stellar · Zugriffsschutz für die Connect-API
   Das Token kommt als „Authorization: Bearer …“, als „X-Stellar-Token“
   oder im Pfad (/connect/t/<token>/…) – Letzteres für Clients, die
   keine eigenen Header setzen können (z. B. Home Assistants MCP-Client).
   ================================================================== */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getSettings } from '../settings/settings.service';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Vergleich in konstanter Zeit, damit die Antwortzeit nichts über das Token verrät */
function tokensMatch(given: string, expected: string): boolean {
    return timingSafeEqual(digest(given), digest(expected));
}

function tokenFromRequest(req: Request, res: Response): string {
    const fromPath = res.locals.pathToken as string | undefined;
    if (fromPath) return fromPath;
    const authorization = req.get('authorization') ?? '';
    if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
    return (req.get('x-stellar-token') ?? '').trim();
}

export function requireApiToken(req: Request, res: Response, next: NextFunction): void {
    const { apiToken } = getSettings();
    if (!apiToken) {
        res.status(503).json({ error: 'Connect-API ist abgeschaltet – kein API-Token eingerichtet' });
        return;
    }
    const token = tokenFromRequest(req, res);
    if (!token || !tokensMatch(token, apiToken)) {
        res.status(401).json({ error: 'Ungültiges oder fehlendes Token' });
        return;
    }
    next();
}

/** Liest das Token aus /connect/t/:token und merkt es für requireApiToken */
export function capturePathToken(req: Request, res: Response, next: NextFunction): void {
    res.locals.pathToken = req.params.token;
    next();
}
