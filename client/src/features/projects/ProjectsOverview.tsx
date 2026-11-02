/* ==================================================================
   Stellar · Übersicht aller Projekte (Kacheln, nach Status gefiltert)
   ================================================================== */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project, ProjectStatus } from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';
import { Icon } from '../../components/ui/Icon';
import { ProjectCard } from './ProjectCard';
import { ProjectDialog } from './ProjectDialog';

type StatusFilter = 'open' | 'all' | ProjectStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'open', label: 'Laufend' },
    { value: 'done', label: 'Abgeschlossen' },
    { value: 'archived', label: 'Archiv' },
    { value: 'all', label: 'Alle' },
];

function matchesFilter(project: Project, filter: StatusFilter): boolean {
    if (filter === 'all') return true;
    // „Laufend“ = aktiv oder pausiert
    if (filter === 'open') return project.status === 'active' || project.status === 'paused';
    return project.status === filter;
}

export function ProjectsOverview() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [filter, setFilter] = useState<StatusFilter>('open');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        document.title = 'Projekte · Stellar';
        projectsApi.listProjects().then(setProjects).catch(console.error);
    }, []);

    const visibleProjects = (projects ?? []).filter(project => matchesFilter(project, filter));

    return (
        <section className="content-wide">
            <header className="view-header">
                <div>
                    <h1 className="view-title">Projekte</h1>
                    <p className="view-subtitle">Ziele mit Aufgaben, Board und Liste.</p>
                </div>
                <button className="button button-primary" onClick={() => setIsCreating(true)}>
                    <Icon name="plus" size={16} /> Neues Projekt
                </button>
            </header>

            <div className="segmented" role="tablist">
                {FILTERS.map(option => (
                    <button
                        key={option.value}
                        role="tab"
                        aria-selected={filter === option.value}
                        className={`segmented-item ${filter === option.value ? 'is-active' : ''}`}
                        onClick={() => setFilter(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {projects === null && <p className="empty-state">Lädt …</p>}
            {projects !== null && visibleProjects.length === 0 && (
                <p className="empty-state">Hier gibt es noch keine Projekte. Leg mit „Neues Projekt“ los.</p>
            )}
            <div className="project-grid">
                {visibleProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>

            {isCreating && (
                <ProjectDialog
                    onClose={() => setIsCreating(false)}
                    onSubmit={async input => {
                        const created = await projectsApi.createProject(input);
                        navigate(`/projects/${created.id}`);
                    }}
                />
            )}
        </section>
    );
}
