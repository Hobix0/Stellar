/* ==================================================================
   Stellar · Eingabefeld „Aufgabe hinzufügen“ (Enter legt an, Feld bleibt offen)
   ================================================================== */

import { useState } from 'react';
import { Icon } from '../../components/ui/Icon';

interface QuickAddTaskProps {
    onCreate: (title: string) => Promise<unknown>;
    /** Kompakt: erst ein Knopf, das Feld erscheint nach Klick (Board-Spalten) */
    compact?: boolean;
}

export function QuickAddTask({ onCreate, compact = false }: QuickAddTaskProps) {
    const [isOpen, setIsOpen] = useState(!compact);
    const [title, setTitle] = useState('');

    if (!isOpen) {
        return (
            <button className="quick-add-button" onClick={() => setIsOpen(true)}>
                <Icon name="plus" size={15} /> Aufgabe
            </button>
        );
    }

    return (
        <form
            className="quick-add"
            onSubmit={event => {
                event.preventDefault();
                const trimmed = title.trim();
                if (!trimmed) return;
                setTitle('');
                void onCreate(trimmed);
            }}
        >
            <input
                className="input"
                placeholder="Neue Aufgabe … (Enter)"
                autoFocus={compact}
                value={title}
                onChange={event => setTitle(event.target.value)}
                onBlur={() => compact && !title && setIsOpen(false)}
                onKeyDown={event => event.key === 'Escape' && compact && setIsOpen(false)}
            />
        </form>
    );
}
