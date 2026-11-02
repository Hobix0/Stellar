/* ==================================================================
   Stellar · Routen der App
   /                 Startseite
   /daily[/:date]    Tagesnotiz (heute bzw. Datum JJJJ-MM-TT)
   /inbox            Inbox
   /wiki/:pageId     Wiki-Seite
   /trash            Papierkorb
   /projects         Projektübersicht
   /projects/:id     Projekt (Board/Liste)
   ================================================================== */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DailyRoute } from './features/daily/DailyRoute';
import { HomeView } from './features/home/HomeView';
import { InboxProvider } from './features/inbox/InboxContext';
import { InboxView } from './features/inbox/InboxView';
import { ProjectsOverview } from './features/projects/ProjectsOverview';
import { ProjectRoute } from './features/projects/ProjectView';
import { PageRoute } from './features/wiki/PageView';
import { PagesProvider } from './features/wiki/PagesContext';
import { TrashView } from './features/wiki/TrashView';

export function App() {
    return (
        <BrowserRouter>
            <PagesProvider>
                <InboxProvider>
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route index element={<HomeView />} />
                            <Route path="daily" element={<DailyRoute />} />
                            <Route path="daily/:date" element={<DailyRoute />} />
                            <Route path="inbox" element={<InboxView />} />
                            <Route path="wiki/:pageId" element={<PageRoute />} />
                            <Route path="trash" element={<TrashView />} />
                            <Route path="projects" element={<ProjectsOverview />} />
                            <Route path="projects/:projectId" element={<ProjectRoute />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </InboxProvider>
            </PagesProvider>
        </BrowserRouter>
    );
}
