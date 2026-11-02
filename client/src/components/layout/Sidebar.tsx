/* ==================================================================
   Stellar · Seitenleiste: Navigation, Suche, Favoriten, Seitenbaum
   ================================================================== */

import { NavLink } from 'react-router-dom';
import { useInbox } from '../../features/inbox/InboxContext';
import { PageTree } from '../../features/wiki/PageTree';
import { pageDisplayTitle, usePages } from '../../features/wiki/PagesContext';
import type { Theme } from '../../lib/theme';
import { Icon } from '../ui/Icon';

interface SidebarProps {
    isOpen: boolean;
    theme: Theme;
    onToggleTheme: () => void;
    onOpenSearch: () => void;
    /** Auf dem Handy schließt sich die Leiste nach einem Klick */
    onNavigate: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Sidebar({ isOpen, theme, onToggleTheme, onOpenSearch, onNavigate }: SidebarProps) {
    const { pages } = usePages();
    const { items: inboxItems, setCaptureOpen } = useInbox();
    const favoritePages = pages.filter(page => page.isFavorite);

    return (
        <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
            <div className="sidebar-brand">
                <img src="/favicon.svg" alt="" width={28} height={28} />
                <span>Stellar</span>
            </div>

            <button className="sidebar-search" onClick={onOpenSearch}>
                <Icon name="search" size={16} />
                <span>Suchen</span>
                <kbd>{isMac ? '⌘' : 'Strg'} K</kbd>
            </button>

            <nav className="sidebar-nav">
                <NavLink to="/" end className="sidebar-link" onClick={onNavigate}>
                    <Icon name="home" /> Start
                </NavLink>
                <NavLink to="/daily" className="sidebar-link" onClick={onNavigate}>
                    <Icon name="sunrise" /> Heute
                </NavLink>
                <NavLink to="/inbox" className="sidebar-link" onClick={onNavigate}>
                    <Icon name="inbox" /> Inbox
                    {inboxItems.length > 0 && <span className="sidebar-badge">{inboxItems.length}</span>}
                </NavLink>
                <NavLink to="/projects" className="sidebar-link" onClick={onNavigate}>
                    <Icon name="projects" /> Projekte
                </NavLink>
            </nav>

            <button
                className="sidebar-capture"
                onClick={() => {
                    onNavigate();
                    setCaptureOpen(true);
                }}
            >
                <Icon name="plus" size={16} />
                <span>Schnell notieren</span>
                <kbd>{isMac ? '⌥' : 'Alt'} N</kbd>
            </button>

            <div className="sidebar-scroll">
                {favoritePages.length > 0 && (
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">
                            <span>Favoriten</span>
                        </div>
                        {favoritePages.map(page => (
                            <NavLink key={page.id} to={`/wiki/${page.id}`} className="page-tree-link sidebar-favorite" onClick={onNavigate}>
                                <span className="page-tree-icon">{page.icon ?? '📄'}</span>
                                <span className="page-tree-title">{pageDisplayTitle(page)}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
                <PageTree onNavigate={onNavigate} />
            </div>

            <div className="sidebar-footer">
                <NavLink to="/trash" className="sidebar-link" onClick={onNavigate}>
                    <Icon name="trash" /> Papierkorb
                </NavLink>
                <button className="icon-button" title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'} onClick={onToggleTheme}>
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
                </button>
            </div>
        </aside>
    );
}
