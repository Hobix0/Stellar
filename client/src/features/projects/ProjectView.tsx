/* ==================================================================
   Stellar · Ansicht eines Projekts
   Kopf (Name, Status, Termine, Wiki-Seite), Umschalter Board/Liste,
   Filter und der Aufgaben-Dialog.
   ================================================================== */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PROJECT_STATUS_LABELS, type TaskStatus } from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';
import { Icon } from '../../components/ui/Icon';
import { formatShortDate } from '../../lib/dates';
import { BoardView } from './BoardView';
import { LinkedPageField } from './LinkedPageField';
import { ListView } from './ListView';
import { ProjectDialog } from './ProjectDialog';
import { QuickAddTask } from './QuickAddTask';
import { TaskDialog } from './TaskDialog';
import { applyTaskFilter, EMPTY_TASK_FILTER, TaskFilterBar, type TaskFilter } from './TaskFilterBar';
import { useProjectData } from './useProjectData';

type ViewMode = 'board' | 'list';
const VIEW_MODE_STORAGE_KEY = 'stellar-project-view';

function loadViewMode(): ViewMode {
    try {
        return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'board';
    } catch {
        return 'board';
    }
}

export function ProjectRoute() {
    const projectId = Number(useParams().projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) return <p className="empty-state">Ungültiges Projekt</p>;
    return <ProjectView key={projectId} projectId={projectId} />;
}

function ProjectView({ projectId }: { projectId: number }) {
    const navigate = useNavigate();
    const data = useProjectData(projectId);
    const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
    const [filter, setFilter] = useState<TaskFilter>(EMPTY_TASK_FILTER);
    const [isEditing, setIsEditing] = useState(false);
    // Geöffnete Aufgabe steht in der URL (?task=12) → Link teilbar, Zurück-Taste schließt
    const [searchParams, setSearchParams] = useSearchParams();
    const openTaskId = Number(searchParams.get('task')) || null;

    const openTask = (taskId: number) => setSearchParams({ task: String(taskId) });
    const closeTask = useCallback(() => setSearchParams({}), [setSearchParams]);

    useEffect(() => {
        if (data.project) document.title = `${data.project.name} · Stellar`;
    }, [data.project]);

    if (data.loadError) return <p className="empty-state">{data.loadError}</p>;
    const { project } = data;
    if (!project) return <p className="empty-state">Lädt …</p>;

    const switchView = (mode: ViewMode) => {
        setViewMode(mode);
        try {
            localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
        } catch {
            // ignorieren
        }
    };

    const createTask = (title: string, status: TaskStatus = 'todo') => data.createTask({ title, status });

    const deleteProject = async () => {
        if (!confirm(`Projekt „${project.name}“ mit allen Aufgaben löschen?`)) return;
        await projectsApi.deleteProject(project.id);
        navigate('/projects');
    };

    const visibleTasks = applyTaskFilter(data.tasks, filter);
    const doneCount = data.tasks.filter(task => task.status === 'done').length;

    return (
        <section className="content-wide project-view">
            <nav className="breadcrumbs">
                <Link to="/projects">Projekte</Link>
            </nav>

            <header className={`project-header color-${project.color}`}>
                <span className="project-header-icon">{project.icon ?? '📁'}</span>
                <div className="project-header-main">
                    <h1 className="view-title">{project.name}</h1>
                    <div className="project-header-meta">
                        <span className={`status-pill status-${project.status}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
                        {(project.startDate || project.dueDate) && (
                            <span>
                                <Icon name="calendar" size={14} /> {project.startDate ? formatShortDate(project.startDate) : '…'} –{' '}
                                {project.dueDate ? formatShortDate(project.dueDate) : '…'}
                            </span>
                        )}
                        <span>
                            {doneCount}/{data.tasks.length} erledigt
                        </span>
                    </div>
                    {project.description && <p className="project-header-description">{project.description}</p>}
                </div>
                <div className="project-header-actions">
                    <button className="icon-button" title="Bearbeiten" onClick={() => setIsEditing(true)}>
                        <Icon name="edit" />
                    </button>
                    <button className="icon-button icon-button-danger" title="Projekt löschen" onClick={() => void deleteProject()}>
                        <Icon name="trash" />
                    </button>
                </div>
            </header>

            <div className="project-wiki-link">
                <span className="form-label">Projekt-Wiki</span>
                <LinkedPageField
                    pageId={project.pageId}
                    suggestedTitle={project.name}
                    suggestedIcon={project.icon}
                    onChange={pageId => void data.updateProject({ pageId })}
                />
            </div>

            <div className="project-toolbar">
                <div className="segmented">
                    <button className={`segmented-item ${viewMode === 'board' ? 'is-active' : ''}`} onClick={() => switchView('board')}>
                        <Icon name="board" size={15} /> Board
                    </button>
                    <button className={`segmented-item ${viewMode === 'list' ? 'is-active' : ''}`} onClick={() => switchView('list')}>
                        <Icon name="list" size={15} /> Liste
                    </button>
                </div>
                <TaskFilterBar filter={filter} labels={data.labels} onChange={setFilter} />
            </div>

            {viewMode === 'board' ? (
                <BoardView
                    tasks={visibleTasks}
                    labels={data.labels}
                    onOpenTask={openTask}
                    onReorderColumn={data.reorderColumn}
                    onCreateTask={createTask}
                />
            ) : (
                <>
                    <QuickAddTask onCreate={title => createTask(title)} />
                    <ListView tasks={visibleTasks} labels={data.labels} onOpenTask={openTask} onUpdateTask={data.updateTask} />
                </>
            )}

            {openTaskId && (
                <TaskDialog
                    taskId={openTaskId}
                    labels={data.labels}
                    onCreateLabel={data.createLabel}
                    onTaskChanged={data.replaceTask}
                    onDelete={data.deleteTask}
                    onClose={closeTask}
                />
            )}
            {isEditing && (
                <ProjectDialog project={project} onClose={() => setIsEditing(false)} onSubmit={input => data.updateProject(input)} />
            )}
        </section>
    );
}
