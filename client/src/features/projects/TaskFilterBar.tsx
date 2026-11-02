/* ==================================================================
   Stellar · Filter über den Aufgaben eines Projekts (Suche, Label, Priorität)
   ================================================================== */

import type { Label, Task } from '../../../../shared/types';

export interface TaskFilter {
    searchText: string;
    labelId: number | null;
    /** Nur Aufgaben mit mindestens dieser Priorität */
    minPriority: number;
    hideDone: boolean;
}

export const EMPTY_TASK_FILTER: TaskFilter = { searchText: '', labelId: null, minPriority: 0, hideDone: false };

export function applyTaskFilter(tasks: Task[], filter: TaskFilter): Task[] {
    const searchText = filter.searchText.trim().toLowerCase();
    return tasks.filter(
        task =>
            (!searchText || task.title.toLowerCase().includes(searchText) || task.description.toLowerCase().includes(searchText)) &&
            (filter.labelId === null || task.labelIds.includes(filter.labelId)) &&
            task.priority >= filter.minPriority &&
            !(filter.hideDone && task.status === 'done'),
    );
}

interface TaskFilterBarProps {
    filter: TaskFilter;
    labels: Label[];
    onChange: (filter: TaskFilter) => void;
}

export function TaskFilterBar({ filter, labels, onChange }: TaskFilterBarProps) {
    return (
        <div className="filter-bar">
            <input
                className="input input-small"
                placeholder="Aufgaben filtern …"
                value={filter.searchText}
                onChange={event => onChange({ ...filter, searchText: event.target.value })}
            />
            <select
                className="input input-small"
                value={filter.labelId ?? ''}
                onChange={event => onChange({ ...filter, labelId: event.target.value ? Number(event.target.value) : null })}
            >
                <option value="">Alle Labels</option>
                {labels.map(label => (
                    <option key={label.id} value={label.id}>
                        {label.name}
                    </option>
                ))}
            </select>
            <select
                className="input input-small"
                value={filter.minPriority}
                onChange={event => onChange({ ...filter, minPriority: Number(event.target.value) })}
            >
                <option value={0}>Jede Priorität</option>
                <option value={1}>ab Niedrig</option>
                <option value={2}>ab Mittel</option>
                <option value={3}>nur Hoch</option>
            </select>
            <label className="checkbox-label">
                <input type="checkbox" checked={filter.hideDone} onChange={event => onChange({ ...filter, hideDone: event.target.checked })} />
                Erledigte ausblenden
            </label>
        </div>
    );
}
