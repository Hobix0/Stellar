/* ==================================================================
   Stellar · API-Aufrufe für die Einstellungen
   ================================================================== */

import type { SettingsInput, SettingsView } from '../../../shared/types';
import { http } from './http';

export const settingsApi = {
    get: () => http.get<SettingsView>('/api/settings'),
    update: (changes: SettingsInput) => http.patch<SettingsView>('/api/settings', changes),
    regenerateToken: () => http.post<SettingsView>('/api/settings/regenerate-token'),
};
