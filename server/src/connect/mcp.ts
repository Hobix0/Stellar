/* ==================================================================
   Stellar · MCP-Server („Jarvis-Werkzeuge“)
   Stellt das Second Brain als Werkzeuge für Sprachmodelle bereit:
   Home Assistants Assist (über dessen MCP-Integration) und Claude.

   Zwei Transporte unter /connect/mcp:
   - Streamable HTTP:  POST /connect/mcp            (Claude, mcp-remote, neue Clients)
   - SSE:              GET  /connect/mcp/sse        (Home Assistant)
                       POST /connect/mcp/messages?sessionId=…
   ================================================================== */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod/v4';
import { RECURRENCES, RECURRENCE_LABELS, TASK_PRIORITIES } from '../../../shared/types';
import { HttpError } from '../http/errors';
import { isValidIsoDate } from '../http/validation';
import { formatLocalTime } from '../integrations/briefing.service';
import { describeNow, localIsoDateTime } from '../integrations/time';
import { dateTimeSchema } from '../reminders/reminders.schemas';
import * as operations from './operations';

const SERVER_VERSION = '0.2.0';

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const text = (value: string): ToolResult => ({ content: [{ type: 'text', text: value }] });

/** Fehler als lesbare Antwort ans Modell statt als Protokollfehler – so kann es nachfragen oder korrigieren */
async function run(action: () => Promise<string>): Promise<ToolResult> {
    try {
        return text(await action());
    } catch (error) {
        const message = error instanceof HttpError || error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: `Fehler: ${message}` }], isError: true };
    }
}

const isoDateArgument = z
    .string()
    .refine(isValidIsoDate, 'Datum im Format JJJJ-MM-TT')
    .optional()
    .describe('Datum JJJJ-MM-TT, leer = heute');

const INSTRUCTIONS = `Stellar ist Lucas persönliches Second Brain (Wiki, Tagesnotizen, Inbox, Projekte, Erinnerungen).
Zeiten sind Ortszeit (Europe/Berlin). Nutze stellar_jetzt, wenn du Datum oder Uhrzeit brauchst, um relative Angaben wie „morgen um 18 Uhr“ umzurechnen.
Schnelle Gedanken gehören in die Inbox (stellar_notieren), Termine mit Uhrzeit sind Erinnerungen, Dinge zum Erledigen sind Aufgaben in einem Projekt.
Antworte kurz – Antworten werden oft vorgelesen.`;

/** Neuer MCP-Server mit allen Werkzeugen (je Verbindung einer, das SDK will es so) */
export function createMcpServer(): McpServer {
    const server = new McpServer({ name: 'stellar', version: SERVER_VERSION }, { instructions: INSTRUCTIONS });

    server.registerTool(
        'stellar_jetzt',
        { description: 'Aktuelles Datum und Uhrzeit in Lucas Zeitzone.', annotations: { readOnlyHint: true } },
        async () => text(`${describeNow()} (${localIsoDateTime()})`),
    );

    server.registerTool(
        'stellar_briefing',
        {
            description: 'Tagesübersicht: heute fällige und überfällige Aufgaben, Erinnerungen, Inbox-Stand, Wetter/Haus-Werte.',
            inputSchema: { datum: isoDateArgument },
            annotations: { readOnlyHint: true },
        },
        async ({ datum }) => run(async () => {
            const briefing = await operations.buildBriefing(datum);
            return `${briefing.dateLabel}\n${briefing.text}`;
        }),
    );

    server.registerTool(
        'stellar_notieren',
        {
            description: 'Gedanken, Idee oder Notiz in die Stellar-Inbox schreiben (zum späteren Einsortieren).',
            inputSchema: { text: z.string().min(1).max(5000).describe('Was notiert werden soll') },
        },
        async ({ text: note }) => run(async () => {
            await operations.captureToInbox(note);
            return `In der Inbox notiert: „${note}“`;
        }),
    );

    server.registerTool(
        'stellar_tagesnotiz_ergaenzen',
        {
            description: 'Text an die Tagesnotiz anhängen (Tagebuch, Protokoll, was heute passiert ist).',
            inputSchema: { text: z.string().min(1).max(10_000), datum: isoDateArgument },
        },
        async ({ text: entry, datum }) => run(async () => {
            const result = await operations.appendToDailyNote(entry, datum);
            return `An die Tagesnotiz vom ${result.date} angehängt.`;
        }),
    );

    server.registerTool(
        'stellar_suchen',
        {
            description: 'Volltextsuche im Wiki und in den Tagesnotizen. Liefert Seiten-IDs für stellar_seite_lesen.',
            inputSchema: { suchbegriff: z.string().min(1).max(200) },
            annotations: { readOnlyHint: true },
        },
        async ({ suchbegriff }) => run(async () => {
            const results = await operations.search(suchbegriff);
            if (results.length === 0) return `Nichts gefunden zu „${suchbegriff}“.`;
            return results
                .map(result => `#${result.id} ${result.title || 'Ohne Titel'}: ${result.snippet.replace(/<\/?mark>/g, '')}`)
                .join('\n');
        }),
    );

    server.registerTool(
        'stellar_seite_lesen',
        {
            description: 'Inhalt einer Wiki-Seite als Text lesen.',
            inputSchema: { seiteId: z.number().int().positive() },
            annotations: { readOnlyHint: true },
        },
        async ({ seiteId }) => run(async () => {
            const page = await operations.readPageText(seiteId);
            return `# ${page.title}\n\n${page.text || '(leer)'}`;
        }),
    );

    server.registerTool(
        'stellar_projekte',
        { description: 'Aktive und pausierte Projekte mit Fortschritt.', annotations: { readOnlyHint: true } },
        async () => run(async () => {
            const projects = await operations.listActiveProjects();
            if (projects.length === 0) return 'Keine aktiven Projekte.';
            return projects
                .map(project => `#${project.id} ${project.icon ?? ''} ${project.name} – ${project.doneTaskCount}/${project.taskCount} erledigt`.replace('  ', ' '))
                .join('\n');
        }),
    );

    server.registerTool(
        'stellar_aufgaben',
        {
            description: 'Offene Aufgaben auflisten: heute (inkl. überfällig), demnächst (7 Tage) oder alle eines Projekts.',
            inputSchema: {
                bereich: z.enum(['today', 'upcoming', 'project']).default('upcoming').describe('today | upcoming | project'),
                projekt: z.string().optional().describe('Projektname oder -ID, nur bei bereich=project'),
            },
            annotations: { readOnlyHint: true },
        },
        async ({ bereich, projekt }) => run(async () => operations.describeTasks(await operations.listTasks(bereich, projekt))),
    );

    server.registerTool(
        'stellar_aufgabe_anlegen',
        {
            description: 'Neue Aufgabe in einem Projekt anlegen.',
            inputSchema: {
                projekt: z.string().min(1).describe('Projektname (Teil reicht, wenn eindeutig) oder -ID'),
                titel: z.string().min(1).max(500),
                beschreibung: z.string().max(10_000).optional(),
                faellig: z.string().refine(isValidIsoDate, 'Datum JJJJ-MM-TT').optional().describe('Fälligkeit JJJJ-MM-TT'),
                prioritaet: z.number().int().min(0).max(3).optional().describe('0 keine, 1 niedrig, 2 mittel, 3 hoch'),
            },
        },
        async ({ projekt, titel, beschreibung, faellig, prioritaet }) => run(async () => {
            const { task, project } = await operations.createTaskIn({
                project: projekt,
                title: titel,
                description: beschreibung,
                dueDate: faellig ?? null,
                priority: (prioritaet ?? 0) as (typeof TASK_PRIORITIES)[number],
            });
            return `Aufgabe #${task.id} „${task.title}“ in ${project.name} angelegt${task.dueDate ? `, fällig ${task.dueDate}` : ''}.`;
        }),
    );

    server.registerTool(
        'stellar_aufgabe_erledigen',
        {
            description: 'Aufgabe als erledigt markieren (ID aus stellar_aufgaben).',
            inputSchema: { aufgabeId: z.number().int().positive() },
        },
        async ({ aufgabeId }) => run(async () => {
            const task = await operations.completeTask(aufgabeId);
            return `Erledigt: „${task.title}“.`;
        }),
    );

    server.registerTool(
        'stellar_erinnerungen',
        { description: 'Offene Erinnerungen mit Zeitpunkt und Wiederholung.', annotations: { readOnlyHint: true } },
        async () => run(async () => {
            const reminders = await operations.listOpenReminders();
            if (reminders.length === 0) return 'Keine offenen Erinnerungen.';
            return reminders
                .map(reminder => {
                    const when = `${new Date(reminder.dueAt).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })} ${formatLocalTime(reminder.dueAt)}`;
                    const repeat = reminder.recurrence === 'none' ? '' : ` (${RECURRENCE_LABELS[reminder.recurrence]})`;
                    return `#${reminder.id} ${when}${repeat}: ${reminder.text}`;
                })
                .join('\n');
        }),
    );

    server.registerTool(
        'stellar_erinnerung_anlegen',
        {
            description: 'Erinnerung anlegen – kommt zum Zeitpunkt als Push aufs iPhone. Relative Angaben vorher mit stellar_jetzt umrechnen.',
            inputSchema: {
                text: z.string().min(1).max(2000).describe('Woran erinnert werden soll'),
                zeitpunkt: z.string().describe('Ortszeit JJJJ-MM-TTTHH:MM, z. B. 2026-11-05T18:00'),
                wiederholung: z.enum(RECURRENCES).default('none').describe('none | daily | weekdays | weekly | monthly'),
            },
        },
        async ({ text: reminderText, zeitpunkt, wiederholung }) => run(async () => {
            const parsed = dateTimeSchema.safeParse(zeitpunkt);
            if (!parsed.success) throw new Error('Zeitpunkt bitte als JJJJ-MM-TTTHH:MM angeben');
            const reminder = await operations.createReminder({ text: reminderText, dueAt: parsed.data, recurrence: wiederholung });
            const when = new Date(reminder.dueAt).toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
            const repeat = wiederholung === 'none' ? '' : `, ${RECURRENCE_LABELS[wiederholung].toLowerCase()}`;
            return `Erinnerung #${reminder.id} gesetzt: ${when}${repeat} – „${reminder.text}“.`;
        }),
    );

    server.registerTool(
        'stellar_erinnerung_erledigen',
        {
            description: 'Erinnerung abhaken (wiederkehrende springen auf den nächsten Termin).',
            inputSchema: { erinnerungId: z.number().int().positive() },
        },
        async ({ erinnerungId }) => run(async () => {
            const reminder = await operations.completeReminder(erinnerungId);
            return reminder.doneAt ? `Erledigt: „${reminder.text}“.` : `„${reminder.text}“ – nächster Termin ${new Date(reminder.dueAt).toLocaleString('de-DE')}.`;
        }),
    );

    server.registerTool(
        'stellar_erinnerung_loeschen',
        {
            description: 'Erinnerung endgültig löschen.',
            inputSchema: { erinnerungId: z.number().int().positive() },
            annotations: { destructiveHint: true },
        },
        async ({ erinnerungId }) => run(async () => {
            await operations.deleteReminder(erinnerungId);
            return `Erinnerung #${erinnerungId} gelöscht.`;
        }),
    );

    return server;
}

/* ------------------------------------------------------------------ */
/*  Transporte                                                        */
/* ------------------------------------------------------------------ */

/** Offene SSE-Verbindungen (Home Assistant hält eine dauerhaft offen) */
const sseSessions = new Map<string, SSEServerTransport>();

export function createMcpRouter(): Router {
    const router = Router();

    /* Streamable HTTP, zustandslos: je Anfrage ein frischer Server */
    router.post('/mcp', async (req: Request, res: Response) => {
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on('close', () => {
            void transport.close();
            void server.close();
        });
        try {
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            console.error('MCP (HTTP):', error);
            if (!res.headersSent) res.status(500).json({ error: 'MCP-Fehler' });
        }
    });

    // Zustandslos: kein GET-Stream und keine Sitzungen zum Beenden
    router.get('/mcp', (_req, res) => {
        res.status(405).set('Allow', 'POST').json({ error: 'Für SSE bitte /mcp/sse verwenden' });
    });
    router.delete('/mcp', (_req, res) => {
        res.status(405).set('Allow', 'POST').json({ error: 'Keine Sitzungen' });
    });

    /* SSE (älterer Transport, den Home Assistant spricht) */
    router.get('/mcp/sse', async (req: Request, res: Response) => {
        // baseUrl enthält ggf. das Pfad-Token – so findet der Client den passenden Nachrichten-Endpunkt
        const transport = new SSEServerTransport(`${req.baseUrl}/mcp/messages`, res);
        sseSessions.set(transport.sessionId, transport);
        const server = createMcpServer();
        res.on('close', () => {
            sseSessions.delete(transport.sessionId);
            void server.close();
        });
        try {
            await server.connect(transport);
        } catch (error) {
            console.error('MCP (SSE):', error);
        }
    });

    router.post('/mcp/messages', async (req: Request, res: Response) => {
        const sessionId = String(req.query.sessionId ?? '');
        const transport = sseSessions.get(sessionId);
        if (!transport) {
            res.status(404).json({ error: 'Unbekannte oder abgelaufene SSE-Sitzung' });
            return;
        }
        await transport.handlePostMessage(req, res, req.body);
    });

    return router;
}
