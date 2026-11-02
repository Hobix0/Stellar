/* ==================================================================
   Stellar · API-Aufrufe für das Wiki
   ================================================================== */

import type { Backlink, Page, PageInput, PageSummary, SearchResult } from '../../../shared/types';
import { http } from './http';

export type TrashedPage = PageSummary & { deletedAt: string };

export const wikiApi = {
    listPages: () => http.get<PageSummary[]>('/api/pages'),
    listRecentPages: () => http.get<PageSummary[]>('/api/pages/recent'),
    listTrash: () => http.get<TrashedPage[]>('/api/pages/trash'),
    getPage: (pageId: number) => http.get<Page>(`/api/pages/${pageId}`),
    createPage: (input: { parentId?: number | null; title?: string; icon?: string | null } = {}) =>
        http.post<Page>('/api/pages', input),
    updatePage: (pageId: number, changes: PageInput) => http.patch<Page>(`/api/pages/${pageId}`, changes),
    reorderPages: (pageIds: number[]) => http.post('/api/pages/reorder', { pageIds }),
    moveToTrash: (pageId: number) => http.delete(`/api/pages/${pageId}`),
    restorePage: (pageId: number) => http.post(`/api/pages/${pageId}/restore`),
    deletePermanently: (pageId: number) => http.delete(`/api/pages/${pageId}/permanent`),
    listBacklinks: (pageId: number) => http.get<Backlink[]>(`/api/pages/${pageId}/backlinks`),
    search: (searchText: string) => http.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(searchText)}`),
};
