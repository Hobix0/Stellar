/* ==================================================================
   Stellar · Auswahl eines Emoji-Icons für Seiten und Projekte
   ================================================================== */

import { useState } from 'react';
import { Popover, type PopoverAnchor } from './Popover';

const SUGGESTED_ICONS = [
    '📄', '📝', '📚', '📖', '🧠', '💡', '⭐', '🚀', '🎯', '📌', '📅', '✅',
    '🗂️', '📁', '🏠', '💼', '🛠️', '⚙️', '🔬', '🎨', '🎵', '🎮', '✈️', '🌍',
    '❤️', '🔥', '🌱', '🍀', '☕', '🍳', '💰', '📈', '🧩', '🔒', '💬', '🌙',
];

interface IconPickerProps {
    anchor: PopoverAnchor;
    onSelect: (icon: string | null) => void;
    onClose: () => void;
}

export function IconPicker({ anchor, onSelect, onClose }: IconPickerProps) {
    const [customIcon, setCustomIcon] = useState('');

    const choose = (icon: string | null) => {
        onSelect(icon);
        onClose();
    };

    return (
        <Popover anchor={anchor} onClose={onClose} className="icon-picker">
            <div className="icon-picker-grid">
                {SUGGESTED_ICONS.map(icon => (
                    <button key={icon} className="icon-picker-item" onClick={() => choose(icon)}>
                        {icon}
                    </button>
                ))}
            </div>
            <form
                className="icon-picker-footer"
                onSubmit={event => {
                    event.preventDefault();
                    if (customIcon.trim()) choose(customIcon.trim());
                }}
            >
                <input
                    className="input"
                    placeholder="Eigenes Emoji …"
                    value={customIcon}
                    maxLength={8}
                    onChange={event => setCustomIcon(event.target.value)}
                />
                <button type="button" className="button button-ghost" onClick={() => choose(null)}>
                    Entfernen
                </button>
            </form>
        </Popover>
    );
}
