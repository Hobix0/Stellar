/* ==================================================================
   Stellar · Labels einer Aufgabe an-/abwählen und neue anlegen
   ================================================================== */

import { useState } from 'react';
import { COLOR_NAMES, type ColorName, type Label } from '../../../../shared/types';

interface LabelPickerProps {
    labels: Label[];
    selectedIds: number[];
    onChange: (labelIds: number[]) => void;
    onCreateLabel: (name: string, color: ColorName) => Promise<Label>;
}

export function LabelPicker({ labels, selectedIds, onChange, onCreateLabel }: LabelPickerProps) {
    const [newLabelName, setNewLabelName] = useState('');

    const toggle = (labelId: number) => {
        onChange(selectedIds.includes(labelId) ? selectedIds.filter(id => id !== labelId) : [...selectedIds, labelId]);
    };

    const create = async () => {
        const name = newLabelName.trim();
        if (!name) return;
        // Farben der Reihe nach vergeben, damit neue Labels unterscheidbar sind
        const color = COLOR_NAMES[labels.length % COLOR_NAMES.length] ?? 'gray';
        const label = await onCreateLabel(name, color);
        setNewLabelName('');
        onChange([...selectedIds, label.id]);
    };

    return (
        <div className="label-picker">
            {labels.map(label => (
                <button
                    key={label.id}
                    type="button"
                    className={`label-chip color-${label.color} ${selectedIds.includes(label.id) ? 'is-selected' : 'is-unselected'}`}
                    onClick={() => toggle(label.id)}
                >
                    {label.name}
                </button>
            ))}
            <input
                className="input input-small label-picker-input"
                placeholder="+ Label"
                value={newLabelName}
                onChange={event => setNewLabelName(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        void create();
                    }
                }}
            />
        </div>
    );
}
