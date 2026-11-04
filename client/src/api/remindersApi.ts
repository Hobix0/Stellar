/* ==================================================================
   Stellar · API-Aufrufe für Erinnerungen, Briefing und Anbindungen
   ================================================================== */

import type { Briefing, IntegrationStatus, Recurrence, Reminder } from '../../../shared/types';
import { http } from './http';

export interface ReminderDraft {
    text: string;
    /** Ortszeit 'JJJJ-MM-TTTHH:MM' – der Server liest sie in seiner Zeitzone */
    dueAt: string;
    recurrence: Recurrence;
}

export const remindersApi = {
    list: (includeDone = false) => http.get<Reminder[]>(`/api/reminders${includeDone ? '?includeDone=1' : ''}`),
    create: (draft: ReminderDraft) => http.post<Reminder>('/api/reminders', draft),
    update: (reminderId: number, changes: Partial<ReminderDraft>) => http.patch<Reminder>(`/api/reminders/${reminderId}`, changes),
    complete: (reminderId: number) => http.post<Reminder>(`/api/reminders/${reminderId}/done`),
    remove: (reminderId: number) => http.delete(`/api/reminders/${reminderId}`),

    briefing: () => http.get<Briefing>('/api/briefing'),
    integrationStatus: () => http.get<IntegrationStatus>('/api/integrations/status'),
    sendTestPush: () => http.post<{ ok: true }>('/api/integrations/test-push'),
};
