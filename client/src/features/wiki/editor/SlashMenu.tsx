/* ==================================================================
   Stellar · Slash-Menü („/“) zum Einfügen bzw. Umwandeln von Blöcken
   Die Tastatur (Pfeile, Enter, Escape) steuert der BlockEditor; dieses
   Menü zeigt nur an und reagiert auf Mausklicks.
   ================================================================== */

import { useEffect, useRef } from 'react';
import { Popover, type PopoverAnchor } from '../../../components/ui/Popover';
import type { BlockDefinition } from './blockDefinitions';

interface SlashMenuProps {
    anchor: PopoverAnchor;
    options: BlockDefinition[];
    selectedIndex: number;
    onSelect: (definition: BlockDefinition) => void;
    onClose: () => void;
}

export function SlashMenu({ anchor, options, selectedIndex, onSelect, onClose }: SlashMenuProps) {
    const listRef = useRef<HTMLDivElement>(null);

    // Ausgewählten Eintrag sichtbar halten
    useEffect(() => {
        listRef.current?.children[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    return (
        <Popover anchor={anchor} onClose={onClose} className="menu slash-menu">
            <div ref={listRef}>
                {options.length === 0 && <div className="menu-empty">Kein passender Block</div>}
                {options.map((definition, index) => (
                    <button
                        key={definition.type}
                        className={`menu-item ${index === selectedIndex ? 'is-active' : ''}`}
                        // mousedown statt click: sonst verliert der Block vorher den Fokus
                        onMouseDown={event => {
                            event.preventDefault();
                            onSelect(definition);
                        }}
                    >
                        <span className="menu-item-symbol">{definition.symbol}</span>
                        <span className="menu-item-text">
                            <span className="menu-item-label">{definition.label}</span>
                            <span className="menu-item-description">{definition.description}</span>
                        </span>
                    </button>
                ))}
            </div>
        </Popover>
    );
}
