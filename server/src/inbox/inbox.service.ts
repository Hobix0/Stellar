/* ==================================================================
   Stellar · Inbox-Einträge einsortieren
   Ein Eintrag wandert in die Tagesnotiz, auf eine Wiki-Seite oder wird
   zur Aufgabe eines Projekts. Danach verschwindet er aus der Inbox.
   ================================================================== */

import type { InboxItem, InboxTarget } from '../../../shared/types';
import { openDailyNote } from '../daily/daily.repository';
import { HttpError, notFound } from '../http/errors';
import { findProject } from '../projects/projects.repository';
import { createTask } from '../projects/tasks.repository';
import { plainTextToBlocks } from '../wiki/blocks';
import { appendBlocksToPage } from '../wiki/pages.repository';
import { deleteInboxItem } from './inbox.repository';

const MAX_TASK_TITLE_LENGTH = 500;

/** Ergebnis: wohin der Eintrag gegangen ist (für die Rückmeldung im Browser) */
export type MoveResult = { kind: 'page'; pageId: number } | { kind: 'task'; projectId: number; taskId: number };

export async function moveInboxItem(item: InboxItem, target: InboxTarget): Promise<MoveResult> {
    let result: MoveResult;

    if (target.kind === 'task') {
        if (!(await findProject(target.projectId))) throw notFound('Projekt');
        // Erste Zeile = Titel, der Rest = Beschreibung
        const [firstLine = '', ...otherLines] = item.text.trim().split(/\r?\n/);
        const task = await createTask(target.projectId, {
            title: firstLine.slice(0, MAX_TASK_TITLE_LENGTH) || 'Aufgabe aus der Inbox',
            description: otherLines.join('\n').trim(),
        });
        result = { kind: 'task', projectId: target.projectId, taskId: task.id };
    } else {
        const pageId = target.kind === 'daily' ? (await openDailyNote(target.date)).id : target.pageId;
        const updated = await appendBlocksToPage(pageId, plainTextToBlocks(item.text));
        if (!updated) throw new HttpError(404, 'Seite nicht gefunden oder im Papierkorb');
        result = { kind: 'page', pageId };
    }

    await deleteInboxItem(item.id);
    return result;
}
