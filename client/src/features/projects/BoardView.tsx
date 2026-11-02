/* ==================================================================
   Stellar · Board (Kanban) mit einer Spalte je Status
   Aufgaben per Drag & Drop innerhalb einer Spalte sortieren oder in eine
   andere Spalte ziehen (ändert den Status).
   ================================================================== */

import { useState, type DragEvent } from 'react';
import { TASK_STATUSES, TASK_STATUS_LABELS, type Label, type Task, type TaskStatus } from '../../../../shared/types';
import { QuickAddTask } from './QuickAddTask';
import { TaskCard, TASK_DRAG_MIME_TYPE } from './TaskCard';

interface BoardViewProps {
    tasks: Task[];
    labels: Label[];
    onOpenTask: (taskId: number) => void;
    onReorderColumn: (status: TaskStatus, orderedTaskIds: number[]) => void;
    onCreateTask: (title: string, status: TaskStatus) => Promise<unknown>;
}

interface DropTarget {
    status: TaskStatus;
    /** Einfügeposition innerhalb der Spalte (ohne die gezogene Karte gezählt) */
    index: number;
}

/** Ermittelt anhand der Mausposition, vor welcher Karte eingefügt wird */
function dropIndexInColumn(columnElement: HTMLElement, clientY: number, draggedTaskId: number): number {
    const cards = [...columnElement.querySelectorAll<HTMLElement>('[data-task-id]')].filter(
        card => Number(card.dataset.taskId) !== draggedTaskId,
    );
    const index = cards.findIndex(card => {
        const rect = card.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
    });
    return index === -1 ? cards.length : index;
}

export function BoardView({ tasks, labels, onOpenTask, onReorderColumn, onCreateTask }: BoardViewProps) {
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

    const endDrag = () => {
        setDraggedTaskId(null);
        setDropTarget(null);
    };

    const handleDragOver = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
        if (draggedTaskId === null) return;
        event.preventDefault();
        const index = dropIndexInColumn(event.currentTarget, event.clientY, draggedTaskId);
        if (dropTarget?.status !== status || dropTarget.index !== index) setDropTarget({ status, index });
    };

    const handleDrop = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
        if (draggedTaskId === null) return;
        event.preventDefault();
        const index = dropIndexInColumn(event.currentTarget, event.clientY, draggedTaskId);
        const columnIds = tasks.filter(task => task.status === status && task.id !== draggedTaskId).map(task => task.id);
        columnIds.splice(index, 0, draggedTaskId);
        onReorderColumn(status, columnIds);
        endDrag();
    };

    return (
        <div className="board" onDragEnd={endDrag}>
            {TASK_STATUSES.map(status => {
                const columnTasks = tasks.filter(task => task.status === status);
                // Die gezogene Karte bleibt im DOM (sonst bricht der Browser das Ziehen ab),
                // zählt aber für die Einfügeposition nicht mit
                const otherTasksCount = columnTasks.filter(task => task.id !== draggedTaskId).length;
                let indexWithoutDragged = 0;
                return (
                    <section
                        key={status}
                        className={`board-column status-column-${status} ${dropTarget?.status === status ? 'is-drop-target' : ''}`}
                        onDragOver={event => handleDragOver(event, status)}
                        onDrop={event => handleDrop(event, status)}
                    >
                        <header className="board-column-header">
                            <span className={`status-dot status-dot-${status}`} />
                            <span>{TASK_STATUS_LABELS[status]}</span>
                            <span className="board-column-count">{columnTasks.length}</span>
                        </header>
                        <div className="board-column-cards">
                            {columnTasks.map(task => {
                                const isDragged = task.id === draggedTaskId;
                                const showPlaceholder =
                                    !isDragged && dropTarget?.status === status && dropTarget.index === indexWithoutDragged;
                                if (!isDragged) indexWithoutDragged++;
                                return (
                                    <div key={task.id}>
                                        {showPlaceholder && <div className="drop-placeholder" />}
                                        <TaskCard
                                            task={task}
                                            labels={labels}
                                            isDragging={isDragged}
                                            onOpen={() => onOpenTask(task.id)}
                                            onDragStart={event => {
                                                event.dataTransfer.setData(TASK_DRAG_MIME_TYPE, String(task.id));
                                                event.dataTransfer.effectAllowed = 'move';
                                                setDraggedTaskId(task.id);
                                            }}
                                        />
                                    </div>
                                );
                            })}
                            {dropTarget?.status === status && dropTarget.index >= otherTasksCount && <div className="drop-placeholder" />}
                        </div>
                        <QuickAddTask compact onCreate={title => onCreateTask(title, status)} />
                    </section>
                );
            })}
        </div>
    );
}
