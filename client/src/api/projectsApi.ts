/* ==================================================================
   Stellar · API-Aufrufe für Projekte, Aufgaben, Checklisten und Labels
   ================================================================== */

import type {
    ChecklistItem,
    ColorName,
    Label,
    Project,
    ProjectInput,
    Task,
    TaskDetail,
    TaskInput,
    TaskStatus,
} from '../../../shared/types';
import { http } from './http';

export const projectsApi = {
    listProjects: () => http.get<Project[]>('/api/projects'),
    getProject: (projectId: number) => http.get<Project>(`/api/projects/${projectId}`),
    createProject: (input: ProjectInput & { name: string }) => http.post<Project>('/api/projects', input),
    updateProject: (projectId: number, changes: ProjectInput) => http.patch<Project>(`/api/projects/${projectId}`, changes),
    deleteProject: (projectId: number) => http.delete(`/api/projects/${projectId}`),

    listTasks: (projectId: number) => http.get<Task[]>(`/api/projects/${projectId}/tasks`),
    listUpcomingTasks: () => http.get<Task[]>('/api/tasks/upcoming'),
    listOpenTasksDueOn: (isoDate: string) => http.get<Task[]>(`/api/tasks/due?date=${isoDate}`),
    getTask: (taskId: number) => http.get<TaskDetail>(`/api/tasks/${taskId}`),
    createTask: (projectId: number, input: TaskInput & { title: string }) =>
        http.post<Task>(`/api/projects/${projectId}/tasks`, input),
    updateTask: (taskId: number, changes: TaskInput) => http.patch<Task>(`/api/tasks/${taskId}`, changes),
    deleteTask: (taskId: number) => http.delete(`/api/tasks/${taskId}`),
    reorderTasks: (projectId: number, status: TaskStatus, taskIds: number[]) =>
        http.post(`/api/projects/${projectId}/tasks/reorder`, { status, taskIds }),

    addChecklistItem: (taskId: number, text: string) => http.post<ChecklistItem>(`/api/tasks/${taskId}/checklist`, { text }),
    updateChecklistItem: (itemId: number, changes: { text?: string; done?: boolean }) =>
        http.patch<ChecklistItem>(`/api/checklist/${itemId}`, changes),
    deleteChecklistItem: (itemId: number) => http.delete(`/api/checklist/${itemId}`),

    listLabels: () => http.get<Label[]>('/api/labels'),
    createLabel: (name: string, color: ColorName) => http.post<Label>('/api/labels', { name, color }),
    deleteLabel: (labelId: number) => http.delete(`/api/labels/${labelId}`),
};
