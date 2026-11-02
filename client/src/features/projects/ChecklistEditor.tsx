/* ==================================================================
   Stellar · Checkliste einer Aufgabe (abhaken, umbenennen, löschen, ergänzen)
   ================================================================== */

import { useState } from 'react';
import type { ChecklistItem } from '../../../../shared/types';
import { projectsApi } from '../../api/projectsApi';
import { Icon } from '../../components/ui/Icon';

interface ChecklistEditorProps {
    taskId: number;
    items: ChecklistItem[];
    onItemsChange: (items: ChecklistItem[]) => void;
}

export function ChecklistEditor({ taskId, items, onItemsChange }: ChecklistEditorProps) {
    const [newItemText, setNewItemText] = useState('');

    const updateItem = async (item: ChecklistItem, changes: { text?: string; done?: boolean }) => {
        onItemsChange(items.map(current => (current.id === item.id ? { ...current, ...changes } : current)));
        await projectsApi.updateChecklistItem(item.id, changes);
    };

    const deleteItem = async (itemId: number) => {
        onItemsChange(items.filter(item => item.id !== itemId));
        await projectsApi.deleteChecklistItem(itemId);
    };

    const addItem = async () => {
        const text = newItemText.trim();
        if (!text) return;
        setNewItemText('');
        const created = await projectsApi.addChecklistItem(taskId, text);
        onItemsChange([...items, created]);
    };

    const doneCount = items.filter(item => item.done).length;

    return (
        <div className="checklist">
            {items.length > 0 && (
                <div className="progress progress-small" aria-label={`${doneCount} von ${items.length} erledigt`}>
                    <div className="progress-bar" style={{ width: `${(doneCount / items.length) * 100}%` }} />
                </div>
            )}
            {items.map(item => (
                <div key={item.id} className={`checklist-item ${item.done ? 'is-done' : ''}`}>
                    <input type="checkbox" checked={item.done} onChange={() => void updateItem(item, { done: !item.done })} />
                    <input
                        className="checklist-item-text"
                        defaultValue={item.text}
                        onBlur={event => {
                            const text = event.target.value.trim();
                            if (text && text !== item.text) void updateItem(item, { text });
                        }}
                    />
                    <button className="icon-button icon-button-small" title="Entfernen" onClick={() => void deleteItem(item.id)}>
                        <Icon name="close" size={14} />
                    </button>
                </div>
            ))}
            <input
                className="input input-small"
                placeholder="+ Punkt hinzufügen (Enter)"
                value={newItemText}
                onChange={event => setNewItemText(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        void addItem();
                    }
                }}
            />
        </div>
    );
}
