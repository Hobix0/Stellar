/* ==================================================================
   Stellar · Daten eines Projekts: Projekt, Aufgaben, Labels
   Änderungen werden sofort im Browser angezeigt („optimistisch“) und
   dann gespeichert; bei einem Fehler wird neu vom Server geladen.
   ================================================================== */

import { useCallback, useEffect, useState } from 'react';
import type { Label, Project, ProjectInput, Task, TaskInput, TaskStatus } from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';

export function useProjectData(projectId: number) {
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            const [loadedProject, loadedTasks, loadedLabels] = await Promise.all([
                projectsApi.getProject(projectId),
                projectsApi.listTasks(projectId),
                projectsApi.listLabels(),
            ]);
            setProject(loadedProject);
            setTasks(loadedTasks);
            setLabels(loadedLabels);
        } catch (error) {
            setLoadError((error as Error).message);
        }
    }, [projectId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    /** Führt eine Server-Aktion aus; schlägt sie fehl, gilt wieder der Stand vom Server */
    const runOrReload = useCallback(
        async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                alert((error as Error).message);
                await reload();
            }
        },
        [reload],
    );

    const updateProject = async (changes: ProjectInput) => {
        const updated = await projectsApi.updateProject(projectId, changes);
        setProject(updated);
    };

    const createTask = async (input: TaskInput & { title: string }) => {
        const created = await projectsApi.createTask(projectId, input);
        setTasks(current => [...current, created]);
        return created;
    };

    const updateTask = (taskId: number, changes: TaskInput) => {
        setTasks(current => current.map(task => (task.id === taskId ? { ...task, ...changes } : task)));
        void runOrReload(async () => {
            const updated = await projectsApi.updateTask(taskId, changes);
            setTasks(current => current.map(task => (task.id === taskId ? updated : task)));
        });
    };

    /** Aufgabe aus dem Dialog vollständig ersetzen (nach Änderungen an Checkliste o. Ä.) */
    const replaceTask = (updated: Task) => {
        setTasks(current => current.map(task => (task.id === updated.id ? updated : task)));
    };

    const deleteTask = (taskId: number) => {
        setTasks(current => current.filter(task => task.id !== taskId));
        void runOrReload(() => projectsApi.deleteTask(taskId));
    };

    /** Board: neue Reihenfolge einer Spalte (inkl. hineingezogener Aufgabe) */
    const reorderColumn = (status: TaskStatus, orderedTaskIds: number[]) => {
        const positionById = new Map(orderedTaskIds.map((taskId, index) => [taskId, index]));
        setTasks(current =>
            current
                .map(task => {
                    const position = positionById.get(task.id);
                    return position === undefined ? task : { ...task, status, position };
                })
                .sort((a, b) => a.position - b.position),
        );
        void runOrReload(() => projectsApi.reorderTasks(projectId, status, orderedTaskIds));
    };

    const createLabel = async (name: string, color: Label['color']) => {
        const created = await projectsApi.createLabel(name, color);
        setLabels(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        return created;
    };

    return {
        project,
        tasks,
        labels,
        loadError,
        reload,
        updateProject,
        createTask,
        updateTask,
        replaceTask,
        deleteTask,
        reorderColumn,
        createLabel,
    };
}

export type ProjectData = ReturnType<typeof useProjectData>;
