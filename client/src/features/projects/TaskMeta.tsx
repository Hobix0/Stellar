/* ==================================================================
   Stellar · Kleine Anzeigen an Aufgaben: Priorität, Fälligkeit, Labels, Checkliste
   ================================================================== */

import { TASK_PRIORITY_LABELS, type Label, type Task } from '../../../../shared/types';
import { formatShortDate, isOverdue, isToday } from '../../lib/dates';

export function PriorityBadge({ priority }: { priority: Task['priority'] }) {
    if (priority === 0) return null;
    return (
        <span className={`priority-badge priority-${priority}`} title={`Priorität: ${TASK_PRIORITY_LABELS[priority]}`}>
            {'!'.repeat(priority)}
        </span>
    );
}

export function DueBadge({ task }: { task: Pick<Task, 'dueDate' | 'status'> }) {
    if (!task.dueDate) return null;
    const isOpen = task.status !== 'done';
    const stateClass = isOpen && isOverdue(task.dueDate) ? 'is-overdue' : isOpen && isToday(task.dueDate) ? 'is-today' : '';
    return <span className={`due-badge ${stateClass}`}>📅 {isToday(task.dueDate) ? 'Heute' : formatShortDate(task.dueDate)}</span>;
}

export function LabelChips({ labelIds, labels }: { labelIds: number[]; labels: Label[] }) {
    if (labelIds.length === 0) return null;
    const labelsById = new Map(labels.map(label => [label.id, label]));
    return (
        <span className="label-chips">
            {labelIds.map(labelId => {
                const label = labelsById.get(labelId);
                return label ? (
                    <span key={label.id} className={`label-chip color-${label.color}`}>
                        {label.name}
                    </span>
                ) : null;
            })}
        </span>
    );
}

export function ChecklistProgress({ task }: { task: Pick<Task, 'checklistDone' | 'checklistTotal'> }) {
    if (task.checklistTotal === 0) return null;
    const complete = task.checklistDone === task.checklistTotal;
    return (
        <span className={`checklist-progress ${complete ? 'is-complete' : ''}`}>
            ☑ {task.checklistDone}/{task.checklistTotal}
        </span>
    );
}
