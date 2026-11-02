/* ==================================================================
   Stellar · Listenansicht: Aufgaben gruppiert nach Status als Tabelle
   ================================================================== */

import { TASK_STATUSES, TASK_STATUS_LABELS, type Label, type Task, type TaskInput } from '../../../../shared/types';
import { ChecklistProgress, DueBadge, LabelChips, PriorityBadge } from './TaskMeta';

interface ListViewProps {
    tasks: Task[];
    labels: Label[];
    onOpenTask: (taskId: number) => void;
    onUpdateTask: (taskId: number, changes: TaskInput) => void;
}

export function ListView({ tasks, labels, onOpenTask, onUpdateTask }: ListViewProps) {
    return (
        <div className="task-list">
            {TASK_STATUSES.map(status => {
                const groupTasks = tasks.filter(task => task.status === status);
                if (groupTasks.length === 0) return null;
                return (
                    <section key={status} className="task-list-group">
                        <h3 className="task-list-group-title">
                            <span className={`status-dot status-dot-${status}`} />
                            {TASK_STATUS_LABELS[status]}
                            <span className="board-column-count">{groupTasks.length}</span>
                        </h3>
                        {groupTasks.map(task => (
                            <div key={task.id} className={`task-row ${task.status === 'done' ? 'is-done' : ''}`}>
                                <input
                                    type="checkbox"
                                    className="task-row-check"
                                    title={task.status === 'done' ? 'Wieder öffnen' : 'Erledigt'}
                                    checked={task.status === 'done'}
                                    onChange={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                                />
                                <button className="task-row-title" onClick={() => onOpenTask(task.id)}>
                                    <PriorityBadge priority={task.priority} />
                                    {task.title}
                                </button>
                                <LabelChips labelIds={task.labelIds} labels={labels} />
                                <ChecklistProgress task={task} />
                                <DueBadge task={task} />
                            </div>
                        ))}
                    </section>
                );
            })}
            {tasks.length === 0 && <p className="empty-state">Keine Aufgaben gefunden.</p>}
        </div>
    );
}
