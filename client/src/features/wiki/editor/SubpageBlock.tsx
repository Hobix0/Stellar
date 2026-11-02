/* ==================================================================
   Stellar · Block „Unterseite“ – Verweis auf eine Seite im Inhalt
   ================================================================== */

import { Link } from 'react-router-dom';
import { pageDisplayTitle, usePages } from '../PagesContext';

export function SubpageBlock({ pageId }: { pageId: number | undefined }) {
    const { pagesById } = usePages();
    const page = pageId ? pagesById.get(pageId) : undefined;

    if (!pageId || !page) {
        return <div className="block-subpage is-missing">📄 Seite gelöscht oder im Papierkorb</div>;
    }
    return (
        <Link to={`/wiki/${page.id}`} className="block-subpage" contentEditable={false}>
            <span className="block-subpage-icon">{page.icon ?? '📄'}</span>
            <span className="block-subpage-title">{pageDisplayTitle(page)}</span>
        </Link>
    );
}
