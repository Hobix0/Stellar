/* ==================================================================
   Stellar · Datenzugriff für Projekte
   ================================================================== */

import type { Project, ProjectInput } from '../../../shared/types';
import { queryOne, queryRows, withTransaction } from '../db/pool';
import { toProject, type ProjectRow } from './mappers';

/** Projekt-Spalten plus Zähler der (erledigten) Aufgaben */
const PROJECT_SELECT = `
    SELECT p.*,
           (SELECT count(*) FROM project_tasks t WHERE t.project_id = p.id) AS task_count,
           (SELECT count(*) FROM project_tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done_task_count
    FROM projects p`;

export async function listProjects(): Promise<Project[]> {
    const rows = await queryRows<ProjectRow>(`${PROJECT_SELECT} ORDER BY p.position, p.id`);
    return rows.map(toProject);
}

export async function findProject(projectId: number): Promise<Project | null> {
    const row = await queryOne<ProjectRow>(`${PROJECT_SELECT} WHERE p.id = $1`, [projectId]);
    return row ? toProject(row) : null;
}

export async function createProject(input: ProjectInput & { name: string }): Promise<Project> {
    const created = await queryOne<{ id: number }>(
        `INSERT INTO projects (name, description, color, icon, status, start_date, due_date, page_id, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (SELECT coalesce(max(position), -1) + 1 FROM projects))
         RETURNING id`,
        [
            input.name,
            input.description ?? '',
            input.color ?? 'blue',
            input.icon ?? null,
            input.status ?? 'active',
            input.startDate ?? null,
            input.dueDate ?? null,
            input.pageId ?? null,
        ],
    );
    return (await findProject(created!.id))!;
}

/** Zuordnung API-Feld → Spalte in der Tabelle */
const PROJECT_COLUMNS: Record<keyof ProjectInput, string> = {
    name: 'name',
    description: 'description',
    color: 'color',
    icon: 'icon',
    status: 'status',
    startDate: 'start_date',
    dueDate: 'due_date',
    pageId: 'page_id',
};

export async function updateProject(projectId: number, changes: ProjectInput): Promise<Project | null> {
    const assignments: string[] = [];
    const params: unknown[] = [projectId];
    for (const [field, column] of Object.entries(PROJECT_COLUMNS) as [keyof ProjectInput, string][]) {
        if (changes[field] === undefined) continue;
        params.push(changes[field]);
        assignments.push(`${column} = $${params.length}`);
    }
    if (assignments.length > 0) {
        await queryRows(`UPDATE projects SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1`, params);
    }
    return findProject(projectId);
}

export async function deleteProject(projectId: number): Promise<boolean> {
    const rows = await queryRows('DELETE FROM projects WHERE id = $1 RETURNING id', [projectId]);
    return rows.length > 0;
}

export async function reorderProjects(projectIds: number[]): Promise<void> {
    await withTransaction(async client => {
        for (const [index, projectId] of projectIds.entries()) {
            await client.query('UPDATE projects SET position = $2 WHERE id = $1', [projectId, index]);
        }
    });
}
