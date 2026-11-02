/* ==================================================================
   Stellar · Seitenbaum in der Seitenleiste
   - Auf-/Zuklappen von Unterseiten (Zustand bleibt im Browser gespeichert)
   - „+“ legt eine Unterseite an
   - Drag & Drop: Seite auf eine andere ziehen → wird deren Unterseite;
     auf die Überschrift „Seiten“ ziehen → oberste Ebene
   ================================================================== */

import { useState, type DragEvent, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { PageSummary } from '../../../../shared/types';
import { wikiApi } from '../../api/wikiApi';
import { Icon } from '../../components/ui/Icon';
import { pageDisplayTitle, usePages } from './PagesContext';

const EXPANDED_STORAGE_KEY = 'stellar-expanded-pages';
const DRAG_MIME_TYPE = 'application/x-stellar-page';

function loadExpandedIds(): Set<number> {
    try {
        return new Set(JSON.parse(localStorage.getItem(EXPANDED_STORAGE_KEY) ?? '[]') as number[]);
    } catch {
        return new Set();
    }
}

function saveExpandedIds(ids: Set<number>): void {
    try {
        localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        // nicht schlimm – nur der Klappzustand geht beim Neuladen verloren
    }
}

/** Liest die ID der gezogenen Seite aus dem Drag-Ereignis */
function draggedPageId(event: DragEvent): number | null {
    const value = Number(event.dataTransfer.getData(DRAG_MIME_TYPE));
    return Number.isInteger(value) && value > 0 ? value : null;
}

export function PageTree({ onNavigate }: { onNavigate?: () => void }) {
    const { pages, reloadPages, createAndOpenPage } = usePages();
    const [expandedIds, setExpandedIds] = useState(loadExpandedIds);
    const [rootDropActive, setRootDropActive] = useState(false);

    // Kinder je Elternseite vorgruppieren (Server liefert bereits sortiert nach Position)
    const childrenByParent = new Map<number | null, PageSummary[]>();
    // Tagesnotizen erscheinen nicht im Seitenbaum (eigener Bereich „Heute“)
    const treePages = pages.filter(page => !page.dailyDate);
    for (const page of treePages) {
        const siblings = childrenByParent.get(page.parentId) ?? [];
        siblings.push(page);
        childrenByParent.set(page.parentId, siblings);
    }

    const toggleExpanded = (pageId: number, expanded?: boolean) => {
        setExpandedIds(current => {
            const next = new Set(current);
            const shouldExpand = expanded ?? !next.has(pageId);
            if (shouldExpand) next.add(pageId);
            else next.delete(pageId);
            saveExpandedIds(next);
            return next;
        });
    };

    const movePage = async (pageId: number, newParentId: number | null) => {
        if (pageId === newParentId) return;
        try {
            await wikiApi.updatePage(pageId, { parentId: newParentId });
            if (newParentId) toggleExpanded(newParentId, true);
            await reloadPages();
        } catch (error) {
            alert((error as Error).message);
        }
    };

    const addChildPage = async (parentId: number) => {
        toggleExpanded(parentId, true);
        await createAndOpenPage(parentId);
        onNavigate?.();
    };

    const renderLevel = (parentId: number | null, depth: number) =>
        (childrenByParent.get(parentId) ?? []).map(page => (
            <PageTreeItem
                key={page.id}
                page={page}
                depth={depth}
                hasChildren={childrenByParent.has(page.id)}
                expanded={expandedIds.has(page.id)}
                onToggle={() => toggleExpanded(page.id)}
                onAddChild={() => void addChildPage(page.id)}
                onDropPage={droppedId => void movePage(droppedId, page.id)}
                onNavigate={onNavigate}
            >
                {expandedIds.has(page.id) && renderLevel(page.id, depth + 1)}
            </PageTreeItem>
        ));

    return (
        <div className="page-tree">
            <div
                className={`sidebar-section-title ${rootDropActive ? 'is-drop-target' : ''}`}
                onDragOver={event => {
                    if (!event.dataTransfer.types.includes(DRAG_MIME_TYPE)) return;
                    event.preventDefault();
                    setRootDropActive(true);
                }}
                onDragLeave={() => setRootDropActive(false)}
                onDrop={event => {
                    setRootDropActive(false);
                    const pageId = draggedPageId(event);
                    if (pageId) void movePage(pageId, null);
                }}
            >
                <span>Seiten</span>
                <button
                    className="icon-button icon-button-small"
                    title="Neue Seite"
                    onClick={() => void createAndOpenPage(null).then(() => onNavigate?.())}
                >
                    <Icon name="plus" size={15} />
                </button>
            </div>
            {treePages.length === 0 && <p className="sidebar-empty">Noch keine Seiten</p>}
            {renderLevel(null, 0)}
        </div>
    );
}

interface PageTreeItemProps {
    page: PageSummary;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
    onToggle: () => void;
    onAddChild: () => void;
    onDropPage: (pageId: number) => void;
    onNavigate?: () => void;
    children: ReactNode;
}

function PageTreeItem({ page, depth, hasChildren, expanded, onToggle, onAddChild, onDropPage, onNavigate, children }: PageTreeItemProps) {
    const [dropActive, setDropActive] = useState(false);

    return (
        <>
            <div
                className={`page-tree-item ${dropActive ? 'is-drop-target' : ''}`}
                style={{ paddingLeft: 6 + depth * 14 }}
                draggable
                onDragStart={event => {
                    event.dataTransfer.setData(DRAG_MIME_TYPE, String(page.id));
                    event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={event => {
                    if (!event.dataTransfer.types.includes(DRAG_MIME_TYPE)) return;
                    event.preventDefault();
                    setDropActive(true);
                }}
                onDragLeave={() => setDropActive(false)}
                onDrop={event => {
                    event.stopPropagation();
                    setDropActive(false);
                    const droppedId = draggedPageId(event);
                    if (droppedId && droppedId !== page.id) onDropPage(droppedId);
                }}
            >
                <button
                    className={`page-tree-toggle ${hasChildren ? '' : 'is-leaf'}`}
                    onClick={onToggle}
                    aria-label={expanded ? 'Zuklappen' : 'Aufklappen'}
                >
                    <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={13} />
                </button>
                <NavLink to={`/wiki/${page.id}`} className="page-tree-link" onClick={onNavigate}>
                    <span className="page-tree-icon">{page.icon ?? '📄'}</span>
                    <span className="page-tree-title">{pageDisplayTitle(page)}</span>
                </NavLink>
                <button className="icon-button icon-button-small page-tree-add" title="Unterseite anlegen" onClick={onAddChild}>
                    <Icon name="plus" size={14} />
                </button>
            </div>
            {children}
        </>
    );
}
