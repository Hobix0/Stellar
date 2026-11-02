/* ==================================================================
   Stellar · Grundgerüst: Seitenleiste links, Inhalt rechts
   Enthält die globalen Tastenkürzel:
     Strg/Cmd + K = Suche, Alt + N = Schnell notieren (Inbox)
   ================================================================== */

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useInbox } from '../../features/inbox/InboxContext';
import { QuickCaptureDialog } from '../../features/inbox/QuickCaptureDialog';
import { SearchDialog } from '../../features/wiki/SearchDialog';
import { applyTheme, loadTheme, type Theme } from '../../lib/theme';
import { Icon } from '../ui/Icon';
import { Sidebar } from './Sidebar';

export function AppLayout() {
    const [theme, setTheme] = useState<Theme>(loadTheme);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { setCaptureOpen } = useInbox();

    useEffect(() => applyTheme(theme), [theme]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsSearchOpen(open => !open);
            }
            // event.code statt event.key: auf dem Mac liefert Alt + N sonst „˜“
            if (event.altKey && !event.metaKey && !event.ctrlKey && event.code === 'KeyN') {
                event.preventDefault();
                setCaptureOpen(true);
            }
        };
        document.addEventListener('keydown', handleShortcut);
        return () => document.removeEventListener('keydown', handleShortcut);
    }, [setCaptureOpen]);

    return (
        <div className="app">
            <Sidebar
                isOpen={isSidebarOpen}
                theme={theme}
                onToggleTheme={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
                onOpenSearch={() => setIsSearchOpen(true)}
                onNavigate={() => setIsSidebarOpen(false)}
            />
            {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

            <main className="main">
                <button className="icon-button mobile-menu-button" aria-label="Menü" onClick={() => setIsSidebarOpen(true)}>
                    <Icon name="menu" />
                </button>
                <Outlet />
            </main>

            {isSearchOpen && <SearchDialog onClose={() => setIsSearchOpen(false)} />}
            <QuickCaptureDialog />
        </div>
    );
}
