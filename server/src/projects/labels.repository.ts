/* ==================================================================
   Stellar · Datenzugriff für Labels (projektübergreifend)
   ================================================================== */

import type { ColorName, Label } from '../../../shared/types';
import { queryOne, queryRows } from '../db/pool';
import { toLabel, type LabelRow } from './mappers';

export async function listLabels(): Promise<Label[]> {
    const rows = await queryRows<LabelRow>('SELECT id, name, color FROM project_labels ORDER BY name');
    return rows.map(toLabel);
}

export async function createLabel(name: string, color: ColorName): Promise<Label> {
    const row = await queryOne<LabelRow>('INSERT INTO project_labels (name, color) VALUES ($1, $2) RETURNING id, name, color', [name, color]);
    return toLabel(row!);
}

export async function updateLabel(labelId: number, changes: { name?: string; color?: ColorName }): Promise<Label | null> {
    const row = await queryOne<LabelRow>(
        `UPDATE project_labels SET name = coalesce($2, name), color = coalesce($3, color)
         WHERE id = $1 RETURNING id, name, color`,
        [labelId, changes.name ?? null, changes.color ?? null],
    );
    return row ? toLabel(row) : null;
}

export async function deleteLabel(labelId: number): Promise<boolean> {
    const rows = await queryRows('DELETE FROM project_labels WHERE id = $1 RETURNING id', [labelId]);
    return rows.length > 0;
}
