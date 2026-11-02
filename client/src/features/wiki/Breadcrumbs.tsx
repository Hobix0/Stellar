/* ==================================================================
   Stellar · Pfad der Seite im Seitenbaum (Elternseiten)
   ================================================================== */

import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { PageSummary } from '../../../../shared/types';
import { pageDisplayTitle, usePages } from './PagesContext';

export function Breadcrumbs({ parentId }: { parentId: number | null }) {
    const { pagesById } = usePages();

    // Von der direkten Elternseite bis zur obersten Ebene hochlaufen (mit Schutz gegen Schleifen)
    const ancestors: PageSummary[] = [];
    let currentId = parentId;
    while (currentId && ancestors.length < 20) {
        const parent = pagesById.get(currentId);
        if (!parent) break;
        ancestors.unshift(parent);
        currentId = parent.parentId;
    }

    return (
        <nav className="breadcrumbs" aria-label="Pfad">
            <Link to="/">Start</Link>
            {ancestors.map(ancestor => (
                <Fragment key={ancestor.id}>
                    <span className="breadcrumbs-separator">/</span>
                    <Link to={`/wiki/${ancestor.id}`}>
                        {ancestor.icon ? `${ancestor.icon} ` : ''}
                        {pageDisplayTitle(ancestor)}
                    </Link>
                </Fragment>
            ))}
        </nav>
    );
}
