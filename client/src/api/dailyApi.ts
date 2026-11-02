/* ==================================================================
   Stellar · API-Aufrufe für Tagesnotizen
   ================================================================== */

import type { Page } from '../../../shared/types';
import { http } from './http';

export const dailyApi = {
    /** Tagesnotiz eines Tages (JJJJ-MM-TT); wird beim ersten Öffnen angelegt */
    openDailyNote: (isoDate: string) => http.post<Page>(`/api/daily/${isoDate}`),
    /** Tage mit beschriebener Tagesnotiz in einem Monat (JJJJ-MM) */
    listDatesInMonth: (yearMonth: string) => http.get<string[]>(`/api/daily?month=${yearMonth}`),
};
