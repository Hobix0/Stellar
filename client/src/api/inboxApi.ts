/* ==================================================================
   Stellar · API-Aufrufe für die Inbox
   ================================================================== */

import type { InboxItem, InboxTarget } from '../../../shared/types';
import { http } from './http';

export type InboxMoveResult = { kind: 'page'; pageId: number } | { kind: 'task'; projectId: number; taskId: number };

export const inboxApi = {
    listItems: () => http.get<InboxItem[]>('/api/inbox'),
    createItem: (text: string) => http.post<InboxItem>('/api/inbox', { text }),
    updateItem: (itemId: number, text: string) => http.patch<InboxItem>(`/api/inbox/${itemId}`, { text }),
    deleteItem: (itemId: number) => http.delete(`/api/inbox/${itemId}`),
    moveItem: (itemId: number, target: InboxTarget) => http.post<InboxMoveResult>(`/api/inbox/${itemId}/move`, target),
};
