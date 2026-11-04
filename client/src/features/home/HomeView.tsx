/* ==================================================================
   Stellar · Startseite
   Fällige Aufgaben, nächste Erinnerungen, zuletzt besuchte Seiten,
   Favoriten und Schnellaktionen.
   ================================================================== */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RECURRENCE_LABELS, type PageSummary, type Project, type Reminder, type Task } from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';
import { remindersApi } from '../../api/remindersApi';
import { wikiApi } from '../../api/wikiApi';
import { Icon } from '../../components/ui/Icon';
import { CaptureForm } from '../inbox/CaptureForm';
import { useInbox } from '../inbox/InboxContext';
import { DueBadge, PriorityBadge } from '../projects/TaskMeta';
import { formatReminderTime } from '../reminders/reminderFormat';
import { pageDisplayTitle, usePages } from '../wiki/PagesContext';

function greetingForNow(): string {
    const hour = new Date().getHours();
    if (hour < 11) return 'Guten Morgen';
    if (hour < 18) return 'Hallo';
    return 'Guten Abend';
}

export function HomeView() {
    const navigate = useNavigate();
    const { pages, createAndOpenPage } = usePages();
    const { items: inboxItems } = useInbox();
    const [recentPages, setRecentPages] = useState<PageSummary[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
    const [projectsById, setProjectsById] = useState<Map<number, Project>>(new Map());
    const [reminders, setReminders] = useState<Reminder[]>([]);

    useEffect(() => {
        document.title = 'Stellar';
        wikiApi.listRecentPages().then(setRecentPages).catch(console.error);
        projectsApi.listUpcomingTasks().then(setUpcomingTasks).catch(console.error);
        remindersApi.list().then(setReminders).catch(console.error);
        projectsApi
            .listProjects()
            .then(projects => setProjectsById(new Map(projects.map(project => [project.id, project]))))
            .catch(console.error);
    }, []);

    const favoritePages = pages.filter(page => page.isFavorite);
    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <section className="content-wide home">
            <header className="view-header">
                <div>
                    <p className="view-subtitle">{today}</p>
                    <h1 className="view-title">{greetingForNow()} ✨</h1>
                </div>
                <div className="home-actions">
                    <button className="button" onClick={() => navigate('/daily')}>
                        <Icon name="sunrise" size={16} /> Tagesnotiz
                    </button>
                    <button className="button" onClick={() => void createAndOpenPage(null)}>
                        <Icon name="page" size={16} /> Neue Seite
                    </button>
                    <button className="button button-primary" onClick={() => navigate('/projects')}>
                        <Icon name="projects" size={16} /> Projekte
                    </button>
                </div>
            </header>

            <article className="card home-capture">
                <div className="home-capture-header">
                    <h2 className="card-title">Schnell notieren</h2>
                    <Link to="/inbox" className="muted">
                        {inboxItems.length > 0 ? `${inboxItems.length} in der Inbox →` : 'Inbox ist leer'}
                    </Link>
                </div>
                <CaptureForm />
            </article>

            <div className="home-grid">
                <article className="card">
                    <h2 className="card-title">Fällige Aufgaben</h2>
                    {upcomingTasks.length === 0 && <p className="muted">Nichts fällig in den nächsten 7 Tagen. 🎉</p>}
                    {upcomingTasks.map(task => {
                        const project = projectsById.get(task.projectId);
                        return (
                            <Link key={task.id} to={`/projects/${task.projectId}?task=${task.id}`} className="list-row-main home-task">
                                <PriorityBadge priority={task.priority} />
                                <span className="list-row-title">{task.title}</span>
                                {project && <span className="list-row-meta">{project.icon ?? '📁'} {project.name}</span>}
                                <DueBadge task={task} />
                            </Link>
                        );
                    })}
                </article>

                <article className="card">
                    <div className="home-capture-header">
                        <h2 className="card-title">Erinnerungen</h2>
                        <Link to="/reminders" className="muted">
                            Alle →
                        </Link>
                    </div>
                    {reminders.length === 0 && <p className="muted">Keine offenen Erinnerungen.</p>}
                    {reminders.slice(0, 5).map(reminder => (
                        <Link key={reminder.id} to="/reminders" className="list-row-main">
                            <Icon name="bell" size={16} />
                            <span className="list-row-title">{reminder.text}</span>
                            <span className="list-row-meta">
                                {formatReminderTime(reminder.dueAt)}
                                {reminder.recurrence !== 'none' && ` · ${RECURRENCE_LABELS[reminder.recurrence]}`}
                            </span>
                        </Link>
                    ))}
                </article>

                <article className="card">
                    <h2 className="card-title">Zuletzt besucht</h2>
                    {recentPages.length === 0 && <p className="muted">Noch keine Seiten besucht.</p>}
                    {recentPages.map(page => (
                        <Link key={page.id} to={`/wiki/${page.id}`} className="list-row-main">
                            <span>{page.icon ?? '📄'}</span>
                            <span className="list-row-title">{pageDisplayTitle(page)}</span>
                        </Link>
                    ))}
                </article>

                {favoritePages.length > 0 && (
                    <article className="card">
                        <h2 className="card-title">Favoriten</h2>
                        {favoritePages.map(page => (
                            <Link key={page.id} to={`/wiki/${page.id}`} className="list-row-main">
                                <span>{page.icon ?? '📄'}</span>
                                <span className="list-row-title">{pageDisplayTitle(page)}</span>
                            </Link>
                        ))}
                    </article>
                )}
            </div>
        </section>
    );
}
