/* ==================================================================
   Stellar · Karte einer Aufgabe im Board (ziehbar)
   ================================================================== */

import type { DragEvent } from 'react';
import type { Label, Task } from '../../../../shared/types';
import { ChecklistProgress, DueBadge, LabelChips, PriorityBadge } from './TaskMeta';

export const TASK_DRAG_MIME_TYPE = 'application/x-stellar-task';

interface TaskCardProps {
    task: Task;
    labels: Label[];
    isDragging: boolean;
    onOpen: () => void;
    onDragStart: (event: DragEvent) => void;
}

export function TaskCard({ task, labels, isDragging, onOpen, onDragStart }: TaskCardProps) {
    return (
        <div
            className={`task-card ${isDragging ? 'is-dragging' : ''} ${task.status === 'done' ? 'is-done' : ''}`}
            draggable
            data-task-id={task.id}
            onDragStart={onDragStart}
            onClick={onOpen}
            role="button"
            tabIndex={0}
            onKeyDown={event => event.key === 'Enter' && onOpen()}
        >
            <LabelChips labelIds={task.labelIds} labels={labels} />
            <div className="task-card-title">
                <PriorityBadge priority={task.priority} />
                {task.title}
            </div>
            <div className="task-card-meta">
                <DueBadge task={task} />
                <ChecklistProgress task={task} />
                {task.pageId && <span title="Mit Wiki-Seite verknüpft">📄</span>}
            </div>
        </div>
    );
}
