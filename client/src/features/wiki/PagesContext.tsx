/* ==================================================================
   Stellar · Gemeinsamer Zustand aller Seiten (Seitenbaum)
   Seitenleiste, Editor (Unterseiten, [[Links]]) und Suche lesen hier
   Titel und Icons, ohne jede Seite einzeln zu laden.
   ================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PageSummary } from '../../../../shared/types';
import { wikiApi } from '../../api/wikiApi';

interface PagesContextValue {
    pages: PageSummary[];
    pagesById: Map<number, PageSummary>;
    /** Lädt den Seitenbaum neu vom Server */
    reloadPages: () => Promise<void>;
    /** Legt eine Seite an und öffnet sie */
    createAndOpenPage: (parentId?: number | null, title?: string) => Promise<PageSummary>;
    /** Übernimmt Änderungen (Titel, Icon, Favorit) sofort in Seitenleiste & Co. */
    patchPageLocally: (pageId: number, changes: Partial<PageSummary>) => void;
}

const PagesContext = createContext<PagesContextValue | null>(null);

export function PagesProvider({ children }: { children: ReactNode }) {
    const [pages, setPages] = useState<PageSummary[]>([]);
    const navigate = useNavigate();

    const reloadPages = useCallback(async () => {
        setPages(await wikiApi.listPages());
    }, []);

    useEffect(() => {
        void reloadPages();
    }, [reloadPages]);

    const createAndOpenPage = useCallback(
        async (parentId: number | null = null, title = '') => {
            const page = await wikiApi.createPage({ parentId, title });
            await reloadPages();
            navigate(`/wiki/${page.id}`);
            return page;
        },
        [navigate, reloadPages],
    );

    const patchPageLocally = useCallback((pageId: number, changes: Partial<PageSummary>) => {
        setPages(current => current.map(page => (page.id === pageId ? { ...page, ...changes } : page)));
    }, []);

    const value = useMemo<PagesContextValue>(
        () => ({
            pages,
            pagesById: new Map(pages.map(page => [page.id, page])),
            reloadPages,
            createAndOpenPage,
            patchPageLocally,
        }),
        [pages, reloadPages, createAndOpenPage, patchPageLocally],
    );

    return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>;
}

export function usePages(): PagesContextValue {
    const context = useContext(PagesContext);
    if (!context) throw new Error('usePages muss innerhalb von <PagesProvider> verwendet werden');
    return context;
}

/** Anzeigename einer Seite (leerer Titel → „Ohne Titel“) */
export function pageDisplayTitle(page: Pick<PageSummary, 'title'> | undefined): string {
    return page?.title.trim() || 'Ohne Titel';
}
