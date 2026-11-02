/* ==================================================================
   Stellar · Route /daily bzw. /daily/:date
   Öffnet (oder legt an) die Tagesnotiz und leitet zur Seite weiter.
   ================================================================== */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dailyApi } from '../../api/dailyApi';
import { isValidIsoDate, todayIsoDate } from '../../lib/dates';
import { usePages } from '../wiki/PagesContext';

export function DailyRoute() {
    const navigate = useNavigate();
    const { reloadPages } = usePages();
    const requestedDate = useParams().date;
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const date = requestedDate && requestedDate !== 'today' ? requestedDate : todayIsoDate();
        if (!isValidIsoDate(date)) {
            setErrorMessage('Ungültiges Datum');
            return;
        }
        let cancelled = false;
        dailyApi
            .openDailyNote(date)
            .then(async page => {
                // Neue Tagesnotiz in den gemeinsamen Seitenzustand übernehmen (für Links/Suche)
                await reloadPages();
                if (!cancelled) navigate(`/wiki/${page.id}`, { replace: true });
            })
            .catch(error => !cancelled && setErrorMessage((error as Error).message));
        return () => {
            cancelled = true;
        };
    }, [requestedDate, navigate, reloadPages]);

    return <p className="empty-state">{errorMessage ?? 'Tagesnotiz wird geöffnet …'}</p>;
}
