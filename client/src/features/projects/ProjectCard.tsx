/* ==================================================================
   Stellar · Karte eines Projekts in der Projektübersicht
   ================================================================== */

import { Link } from 'react-router-dom';
import { PROJECT_STATUS_LABELS, type Project } from '../../../../shared/types';
import { formatShortDate, isOverdue } from '../../lib/dates';

export function ProjectCard({ project }: { project: Project }) {
    const progressPercent = project.taskCount > 0 ? Math.round((project.doneTaskCount / project.taskCount) * 100) : 0;
    const overdue = project.status === 'active' && isOverdue(project.dueDate);

    return (
        <Link to={`/projects/${project.id}`} className={`project-card color-${project.color}`}>
            <div className="project-card-head">
                <span className="project-card-icon">{project.icon ?? '📁'}</span>
                <span className={`status-pill status-${project.status}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
            </div>
            <h3 className="project-card-name">{project.name}</h3>
            {project.description && <p className="project-card-description">{project.description}</p>}
            <div className="progress" aria-label={`${progressPercent} % erledigt`}>
                <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="project-card-meta">
                <span>
                    {project.doneTaskCount}/{project.taskCount} Aufgaben
                </span>
                {project.dueDate && <span className={overdue ? 'is-overdue' : ''}>bis {formatShortDate(project.dueDate)}</span>}
            </div>
        </Link>
    );
}
