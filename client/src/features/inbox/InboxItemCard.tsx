/* ==================================================================
   Stellar · Ein Inbox-Eintrag mit Aktionen zum Einsortieren
   → Heute (Tagesnotiz), → Seite, → Aufgabe, Bearbeiten, Löschen
   ================================================================== */

import { useState } from 'react';
import type { InboxItem, InboxTarget, Project } from '../../../../shared/types';
import type { InboxMoveResult } from '../../api/inboxApi';
import { Icon } from '../../components/ui/Icon';
import { anchorBelow, Popover, type PopoverAnchor } from '../../components/ui/Popover';
import { formatRelativeTime, todayIsoDate } from '../../lib/dates';
import { pageDisplayTitle, usePages } from '../wiki/PagesContext';
import { useInbox } from './InboxContext';

interface InboxItemCardProps {
    item: InboxItem;
    projects: Project[];
    onMoved: (result: InboxMoveResult, label: string) => void;
}

type OpenPicker = { kind: 'page' | 'task'; anchor: PopoverAnchor } | null;

export function InboxItemCard({ item, projects, onMoved }: InboxItemCardProps) {
    const { pages } = usePages();
    const { moveItem, updateItem, deleteItem } = useInbox();
    const [picker, setPicker] = useState<OpenPicker>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [draftText, setDraftText] = useState(item.text);
    const [isBusy, setIsBusy] = useState(false);

    // Tagesnotizen sind über „→ Heute“ erreichbar; hier nur normale Seiten anbieten
    const selectablePages = pages.filter(page => !page.dailyDate);
    const openProjects = projects.filter(project => project.status === 'active' || project.status === 'paused');

    const move = async (target: InboxTarget, label: string) => {
        setPicker(null);
        setIsBusy(true);
        try {
            onMoved(await moveItem(item.id, target), label);
        } catch (error) {
            alert((error as Error).message);
            setIsBusy(false);
        }
    };

    const saveEdit = async () => {
        const text = draftText.trim();
        if (text && text !== item.text) await updateItem(item.id, text);
        setIsEditing(false);
    };

    return (
        <article className={`inbox-item ${isBusy ? 'is-busy' : ''}`}>
            {isEditing ? (
                <textarea
                    className="input"
                    rows={3}
                    autoFocus
                    value={draftText}
                    onChange={event => setDraftText(event.target.value)}
                    onBlur={() => void saveEdit()}
                    onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            void saveEdit();
                        }
                        if (event.key === 'Escape') {
                            setDraftText(item.text);
                            setIsEditing(false);
                        }
                    }}
                />
            ) : (
                <p className="inbox-item-text" onDoubleClick={() => setIsEditing(true)}>
                    {item.text}
                </p>
            )}

            <footer className="inbox-item-footer">
                <span className="muted">{formatRelativeTime(item.createdAt)}</span>
                <div className="inbox-item-actions">
                    <button className="button button-small" onClick={() => void move({ kind: 'daily', date: todayIsoDate() }, 'Tagesnotiz von heute')}>
                        → Heute
                    </button>
                    <button className="button button-small" onClick={event => setPicker({ kind: 'page', anchor: anchorBelow(event.currentTarget) })}>
                        → Seite
                    </button>
                    <button className="button button-small" onClick={event => setPicker({ kind: 'task', anchor: anchorBelow(event.currentTarget) })}>
                        → Aufgabe
                    </button>
                    <button className="icon-button icon-button-small" title="Bearbeiten" onClick={() => setIsEditing(true)}>
                        <Icon name="edit" size={14} />
                    </button>
                    <button className="icon-button icon-button-small icon-button-danger" title="Löschen" onClick={() => void deleteItem(item.id)}>
                        <Icon name="trash" size={14} />
                    </button>
                </div>
            </footer>

            {picker?.kind === 'page' && (
                <Popover anchor={picker.anchor} onClose={() => setPicker(null)} className="menu">
                    <div className="menu-heading">An Seite anhängen</div>
                    {selectablePages.length === 0 && <div className="menu-empty">Noch keine Seiten</div>}
                    {selectablePages.map(page => (
                        <button
                            key={page.id}
                            className="menu-item"
                            onClick={() => void move({ kind: 'page', pageId: page.id }, pageDisplayTitle(page))}
                        >
                            <span>{page.icon ?? '📄'}</span>
                            <span className="menu-item-label">{pageDisplayTitle(page)}</span>
                        </button>
                    ))}
                </Popover>
            )}
            {picker?.kind === 'task' && (
                <Popover anchor={picker.anchor} onClose={() => setPicker(null)} className="menu">
                    <div className="menu-heading">Als Aufgabe in Projekt</div>
                    {openProjects.length === 0 && <div className="menu-empty">Kein laufendes Projekt</div>}
                    {openProjects.map(project => (
                        <button
                            key={project.id}
                            className="menu-item"
                            onClick={() => void move({ kind: 'task', projectId: project.id }, project.name)}
                        >
                            <span>{project.icon ?? '📁'}</span>
                            <span className="menu-item-label">{project.name}</span>
                        </button>
                    ))}
                </Popover>
            )}
        </article>
    );
}
