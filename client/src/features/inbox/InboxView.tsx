/* ==================================================================
   Stellar · Inbox: alles Notierte sammeln und einsortieren
   /inbox?capture=1 (z. B. Verknüpfung auf dem Handy) setzt den Fokus
   direkt ins Eingabefeld.
   ================================================================== */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Project } from '../../../../shared/types';
import type { InboxMoveResult } from '../../api/inboxApi';
import { projectsApi } from '../../api/projectsApi';
import { CaptureForm } from './CaptureForm';
import { InboxItemCard } from './InboxItemCard';
import { useInbox } from './InboxContext';

interface MoveNotice {
    label: string;
    url: string;
}

export function InboxView() {
    const { items, isLoaded } = useInbox();
    const [searchParams] = useSearchParams();
    const [projects, setProjects] = useState<Project[]>([]);
    const [moveNotice, setMoveNotice] = useState<MoveNotice | null>(null);

    useEffect(() => {
        document.title = 'Inbox · Stellar';
        projectsApi.listProjects().then(setProjects).catch(console.error);
    }, []);

    // Hinweis „Verschoben nach …“ nach ein paar Sekunden ausblenden
    useEffect(() => {
        if (!moveNotice) return;
        const timer = setTimeout(() => setMoveNotice(null), 5000);
        return () => clearTimeout(timer);
    }, [moveNotice]);

    const handleMoved = (result: InboxMoveResult, label: string) => {
        const url = result.kind === 'task' ? `/projects/${result.projectId}?task=${result.taskId}` : `/wiki/${result.pageId}`;
        setMoveNotice({ label, url });
    };

    return (
        <section className="content-narrow">
            <header className="view-header">
                <div>
                    <h1 className="view-title">Inbox</h1>
                    <p className="view-subtitle">Erst festhalten, später einsortieren. Überall mit Alt + N.</p>
                </div>
            </header>

            <CaptureForm autoFocus={searchParams.has('capture')} />

            {moveNotice && (
                <div className="banner banner-success">
                    <span>Verschoben nach „{moveNotice.label}“</span>
                    <Link to={moveNotice.url} className="button button-small">
                        Öffnen
                    </Link>
                </div>
            )}

            {!isLoaded && <p className="empty-state">Lädt …</p>}
            {isLoaded && items.length === 0 && <p className="empty-state">Inbox leer – alles einsortiert. ✨</p>}
            <div className="inbox-list">
                {items.map(item => (
                    <InboxItemCard key={item.id} item={item} projects={projects} onMoved={handleMoved} />
                ))}
            </div>
        </section>
    );
}
