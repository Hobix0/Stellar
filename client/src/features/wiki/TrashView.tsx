/* ==================================================================
   Stellar · Papierkorb: gelöschte Seiten wiederherstellen oder endgültig löschen
   Nach 30 Tagen räumt der Server sie automatisch weg.
   ================================================================== */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wikiApi, type TrashedPage } from '../../api/wikiApi';
import { Icon } from '../../components/ui/Icon';
import { formatRelativeTime } from '../../lib/dates';
import { pageDisplayTitle, usePages } from './PagesContext';

export function TrashView() {
    const { reloadPages } = usePages();
    const [trashedPages, setTrashedPages] = useState<TrashedPage[] | null>(null);

    const loadTrash = useCallback(() => {
        wikiApi.listTrash().then(setTrashedPages).catch(console.error);
    }, []);

    useEffect(() => {
        document.title = 'Papierkorb · Stellar';
        loadTrash();
    }, [loadTrash]);

    const restore = async (pageId: number) => {
        await wikiApi.restorePage(pageId);
        await reloadPages();
        loadTrash();
    };

    const deleteForever = async (page: TrashedPage) => {
        if (!confirm(`„${pageDisplayTitle(page)}“ und alle Unterseiten endgültig löschen?`)) return;
        await wikiApi.deletePermanently(page.id);
        loadTrash();
    };

    return (
        <section className="content-narrow">
            <h1 className="view-title">Papierkorb</h1>
            <p className="view-subtitle">Gelöschte Seiten bleiben 30 Tage hier.</p>
            {trashedPages === null && <p className="empty-state">Lädt …</p>}
            {trashedPages?.length === 0 && <p className="empty-state">Der Papierkorb ist leer.</p>}
            <div className="card-list">
                {trashedPages?.map(page => (
                    <div key={page.id} className="list-row">
                        <Link to={`/wiki/${page.id}`} className="list-row-main">
                            <span>{page.icon ?? '📄'}</span>
                            <span className="list-row-title">{pageDisplayTitle(page)}</span>
                            <span className="list-row-meta">gelöscht {formatRelativeTime(page.deletedAt)}</span>
                        </Link>
                        <button className="icon-button" title="Wiederherstellen" onClick={() => void restore(page.id)}>
                            <Icon name="restore" />
                        </button>
                        <button className="icon-button icon-button-danger" title="Endgültig löschen" onClick={() => void deleteForever(page)}>
                            <Icon name="trash" />
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
