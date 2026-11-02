/* ==================================================================
   Stellar · Verknüpfung mit einer Wiki-Seite (für Projekte und Aufgaben)
   Vorhandene Seite wählen oder eine neue mit passendem Titel anlegen.
   ================================================================== */

import { Link } from 'react-router-dom';
import { wikiApi } from '../../api/wikiApi';
import { pageDisplayTitle, usePages } from '../wiki/PagesContext';

interface LinkedPageFieldProps {
    pageId: number | null;
    /** Titel für eine neu angelegte Seite */
    suggestedTitle: string;
    suggestedIcon?: string | null;
    onChange: (pageId: number | null) => void;
}

export function LinkedPageField({ pageId, suggestedTitle, suggestedIcon, onChange }: LinkedPageFieldProps) {
    const { pages, pagesById, reloadPages } = usePages();
    const linkedPage = pageId ? pagesById.get(pageId) : undefined;

    const createLinkedPage = async () => {
        const page = await wikiApi.createPage({ title: suggestedTitle, icon: suggestedIcon ?? null });
        await reloadPages();
        onChange(page.id);
    };

    if (linkedPage) {
        return (
            <div className="linked-page">
                <Link to={`/wiki/${linkedPage.id}`} className="linked-page-link">
                    {linkedPage.icon ?? '📄'} {pageDisplayTitle(linkedPage)}
                </Link>
                <button type="button" className="button button-ghost button-small" onClick={() => onChange(null)}>
                    Lösen
                </button>
            </div>
        );
    }

    return (
        <div className="linked-page">
            <select
                className="input input-small"
                value=""
                onChange={event => event.target.value && onChange(Number(event.target.value))}
            >
                <option value="">Seite wählen …</option>
                {pages.map(page => (
                    <option key={page.id} value={page.id}>
                        {page.icon ?? '📄'} {pageDisplayTitle(page)}
                    </option>
                ))}
            </select>
            <button type="button" className="button button-small" onClick={() => void createLinkedPage()}>
                Neue Seite
            </button>
        </div>
    );
}
