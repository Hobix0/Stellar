/* ==================================================================
   Stellar · „Verlinkt von“ – Seiten, die auf die aktuelle Seite verweisen
   ================================================================== */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Backlink } from '../../../../shared/types';
import { wikiApi } from '../../api/wikiApi';
import { pageDisplayTitle } from './PagesContext';

/** `refreshKey` ändert sich nach dem Speichern, damit die Liste aktuell bleibt */
export function Backlinks({ pageId, refreshKey }: { pageId: number; refreshKey: string }) {
    const [backlinks, setBacklinks] = useState<Backlink[]>([]);

    useEffect(() => {
        let cancelled = false;
        wikiApi
            .listBacklinks(pageId)
            .then(result => !cancelled && setBacklinks(result))
            .catch(console.error);
        return () => {
            cancelled = true;
        };
    }, [pageId, refreshKey]);

    if (backlinks.length === 0) return null;
    return (
        <section className="backlinks">
            <h3 className="backlinks-title">Verlinkt von {backlinks.length} Seite{backlinks.length === 1 ? '' : 'n'}</h3>
            <div className="backlinks-list">
                {backlinks.map(backlink => (
                    <Link key={backlink.id} to={`/wiki/${backlink.id}`} className="backlink">
                        <span>{backlink.icon ?? '📄'}</span>
                        <span>{pageDisplayTitle(backlink)}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
