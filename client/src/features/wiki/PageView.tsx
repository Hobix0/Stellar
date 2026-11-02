/* ==================================================================
   Stellar · Ansicht einer Wiki-Seite
   Lädt die Seite, zeigt Kopf + Editor + Rückverweise und speichert
   Änderungen verzögert (siehe useDebouncedSave).
   ================================================================== */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Block, Page, PageInput } from '../../../../shared/types';
import { ApiError } from '../../api/http';
import { wikiApi } from '../../api/wikiApi';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import { DailyNoteBar } from '../daily/DailyNoteBar';
import { Backlinks } from './Backlinks';
import { Breadcrumbs } from './Breadcrumbs';
import { BlockEditor } from './editor/BlockEditor';
import { placeCaret } from './editor/caret';
import { PageHeader } from './PageHeader';
import { usePages } from './PagesContext';

/** Route /wiki/:pageId – der key sorgt für einen frischen Zustand je Seite */
export function PageRoute() {
    const pageId = Number(useParams().pageId);
    if (!Number.isInteger(pageId) || pageId <= 0) return <p className="empty-state">Ungültige Seite</p>;
    return <PageView key={pageId} pageId={pageId} />;
}

function PageView({ pageId }: { pageId: number }) {
    const navigate = useNavigate();
    const { patchPageLocally, reloadPages } = usePages();
    const [page, setPage] = useState<Page | null>(null);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState('');

    const savePage = useCallback(
        async (changes: PageInput) => {
            const saved = await wikiApi.updatePage(pageId, changes);
            setLastSavedAt(saved.updatedAt);
        },
        [pageId],
    );
    const { schedule, flush, saveState } = useDebouncedSave<PageInput>(savePage);

    useEffect(() => {
        wikiApi
            .getPage(pageId)
            .then(loaded => {
                setPage(loaded);
                setBlocks(loaded.blocks);
                setLastSavedAt(loaded.updatedAt);
                document.title = `${loaded.title || 'Ohne Titel'} · Stellar`;
            })
            .catch(error => setLoadError(error instanceof ApiError && error.status === 404 ? 'Diese Seite gibt es nicht.' : String(error)));
    }, [pageId]);

    if (loadError) return <p className="empty-state">{loadError}</p>;
    if (!page) return <p className="empty-state">Lädt …</p>;

    const isTrashed = Boolean(page.deletedAt);

    /** Ändert Felder im Seitenkopf: sofort anzeigen, verzögert speichern */
    const changePage = (changes: Partial<Pick<Page, 'title' | 'icon' | 'isFavorite'>>) => {
        setPage({ ...page, ...changes });
        patchPageLocally(page.id, changes);
        schedule(changes);
        if (changes.title !== undefined) document.title = `${changes.title || 'Ohne Titel'} · Stellar`;
    };

    const changeBlocks = (nextBlocks: Block[]) => {
        setBlocks(nextBlocks);
        schedule({ blocks: nextBlocks });
    };

    const focusFirstBlock = () => {
        const firstEditable = document.querySelector<HTMLElement>('.block-editor [data-editable]');
        if (firstEditable) placeCaret(firstEditable, 'start');
    };

    const moveToTrash = async () => {
        await flush();
        await wikiApi.moveToTrash(page.id);
        await reloadPages();
        navigate(page.parentId ? `/wiki/${page.parentId}` : '/');
    };

    const restore = async () => {
        await wikiApi.restorePage(page.id);
        await reloadPages();
        setPage({ ...page, deletedAt: null });
    };

    return (
        <article className="page-view">
            {isTrashed && (
                <div className="banner banner-warning">
                    Diese Seite liegt im Papierkorb.
                    <button className="button button-small" onClick={() => void restore()}>
                        Wiederherstellen
                    </button>
                </div>
            )}
            {page.dailyDate ? <DailyNoteBar date={page.dailyDate} /> : <Breadcrumbs parentId={page.parentId} />}
            <PageHeader
                title={page.title}
                icon={page.icon}
                isFavorite={page.isFavorite}
                readOnly={isTrashed}
                saveState={saveState}
                onTitleChange={title => changePage({ title })}
                onTitleEnter={focusFirstBlock}
                onIconChange={icon => changePage({ icon })}
                onToggleFavorite={() => changePage({ isFavorite: !page.isFavorite })}
                onMoveToTrash={() => void moveToTrash()}
            />
            <BlockEditor pageId={page.id} blocks={blocks} readOnly={isTrashed} onChange={changeBlocks} />
            <Backlinks pageId={page.id} refreshKey={lastSavedAt} />
        </article>
    );
}
