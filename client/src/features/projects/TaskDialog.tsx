/* ==================================================================
   Stellar · Details einer Aufgabe bearbeiten
   Jede Änderung wird direkt gespeichert (kein „Speichern“-Knopf).
   ================================================================== */

import { useEffect, useState } from 'react';
import {
    TASK_PRIORITIES,
    TASK_PRIORITY_LABELS,
    TASK_STATUSES,
    TASK_STATUS_LABELS,
    type ChecklistItem,
    type ColorName,
    type Label,
    type Task,
    type TaskDetail,
    type TaskInput,
    type TaskPriority,
    type TaskStatus,
} from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';
import { Modal } from '../../components/ui/Modal';
import { ChecklistEditor } from './ChecklistEditor';
import { LabelPicker } from './LabelPicker';
import { LinkedPageField } from './LinkedPageField';

interface TaskDialogProps {
    taskId: number;
    labels: Label[];
    onCreateLabel: (name: string, color: ColorName) => Promise<Label>;
    /** Meldet den neuen Stand an Board/Liste */
    onTaskChanged: (task: Task) => void;
    onDelete: (taskId: number) => void;
    onClose: () => void;
}

export function TaskDialog({ taskId, labels, onCreateLabel, onTaskChanged, onDelete, onClose }: TaskDialogProps) {
    const [task, setTask] = useState<TaskDetail | null>(null);

    useEffect(() => {
        projectsApi.getTask(taskId).then(setTask).catch(error => {
            alert((error as Error).message);
            onClose();
        });
    }, [taskId, onClose]);

    if (!task) return null;

    /** Feld ändern: sofort anzeigen, speichern, Board aktualisieren */
    const saveChanges = async (changes: TaskInput) => {
        setTask({ ...task, ...changes });
        const updated = await projectsApi.updateTask(task.id, changes);
        setTask(current => (current ? { ...current, ...updated } : current));
        onTaskChanged(updated);
    };

    const changeChecklist = (checklist: ChecklistItem[]) => {
        const counts = { checklistTotal: checklist.length, checklistDone: checklist.filter(item => item.done).length };
        setTask({ ...task, checklist, ...counts });
        onTaskChanged({ ...task, ...counts });
    };

    const deleteTask = () => {
        if (!confirm(`Aufgabe „${task.title}“ löschen?`)) return;
        onDelete(task.id);
        onClose();
    };

    return (
        <Modal onClose={onClose} size="large">
            <div className="task-dialog">
                <input
                    className="task-dialog-title"
                    defaultValue={task.title}
                    aria-label="Titel"
                    onBlur={event => {
                        const title = event.target.value.trim();
                        if (title && title !== task.title) void saveChanges({ title });
                    }}
                    onKeyDown={event => event.key === 'Enter' && event.currentTarget.blur()}
                />

                <div className="task-dialog-fields">
                    <label className="field">
                        <span className="form-label">Status</span>
                        <select
                            className="input input-small"
                            value={task.status}
                            onChange={event => void saveChanges({ status: event.target.value as TaskStatus })}
                        >
                            {TASK_STATUSES.map(status => (
                                <option key={status} value={status}>
                                    {TASK_STATUS_LABELS[status]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span className="form-label">Priorität</span>
                        <select
                            className="input input-small"
                            value={task.priority}
                            onChange={event => void saveChanges({ priority: Number(event.target.value) as TaskPriority })}
                        >
                            {TASK_PRIORITIES.map(priority => (
                                <option key={priority} value={priority}>
                                    {TASK_PRIORITY_LABELS[priority]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span className="form-label">Start</span>
                        <input
                            type="date"
                            className="input input-small"
                            value={task.startDate ?? ''}
                            onChange={event => void saveChanges({ startDate: event.target.value || null })}
                        />
                    </label>
                    <label className="field">
                        <span className="form-label">Fällig</span>
                        <input
                            type="date"
                            className="input input-small"
                            value={task.dueDate ?? ''}
                            onChange={event => void saveChanges({ dueDate: event.target.value || null })}
                        />
                    </label>
                </div>

                <div className="field">
                    <span className="form-label">Labels</span>
                    <LabelPicker
                        labels={labels}
                        selectedIds={task.labelIds}
                        onChange={labelIds => void saveChanges({ labelIds })}
                        onCreateLabel={onCreateLabel}
                    />
                </div>

                <label className="field">
                    <span className="form-label">Beschreibung</span>
                    <textarea
                        className="input"
                        rows={5}
                        defaultValue={task.description}
                        placeholder="Worum geht es? Notizen, Links, Ideen …"
                        onBlur={event => event.target.value !== task.description && void saveChanges({ description: event.target.value })}
                    />
                </label>

                <div className="field">
                    <span className="form-label">Checkliste</span>
                    <ChecklistEditor taskId={task.id} items={task.checklist} onItemsChange={changeChecklist} />
                </div>

                <div className="field">
                    <span className="form-label">Wiki-Seite</span>
                    <LinkedPageField pageId={task.pageId} suggestedTitle={task.title} onChange={pageId => void saveChanges({ pageId })} />
                </div>

                <footer className="task-dialog-footer">
                    <span className="muted">Erstellt am {new Date(task.createdAt).toLocaleDateString('de-DE')}</span>
                    <button className="button button-danger" onClick={deleteTask}>
                        Aufgabe löschen
                    </button>
                </footer>
            </div>
        </Modal>
    );
}
