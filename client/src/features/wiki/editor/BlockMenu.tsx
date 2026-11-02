/* ==================================================================
   Stellar · Menü am Griff eines Blocks: umwandeln, duplizieren, löschen
   ================================================================== */

import type { BlockType } from '../../../../../shared/types';
import { Popover, type PopoverAnchor } from '../../../components/ui/Popover';
import { BLOCK_DEFINITIONS } from './blockDefinitions';

interface BlockMenuProps {
    anchor: PopoverAnchor;
    currentType: BlockType;
    onConvert: (type: BlockType) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onClose: () => void;
}

/** In diese Typen lässt sich ein Textblock umwandeln (ohne Trennlinie/Unterseite) */
const CONVERTIBLE_TYPES = BLOCK_DEFINITIONS.filter(definition => !definition.isAtomic);

export function BlockMenu({ anchor, currentType, onConvert, onDuplicate, onDelete, onClose }: BlockMenuProps) {
    const isAtomic = currentType === 'divider' || currentType === 'subpage';
    const run = (action: () => void) => {
        action();
        onClose();
    };

    return (
        <Popover anchor={anchor} onClose={onClose} className="menu block-menu">
            <button className="menu-item" onClick={() => run(onDuplicate)}>
                <span className="menu-item-symbol">⧉</span>
                <span className="menu-item-label">Duplizieren</span>
            </button>
            <button className="menu-item menu-item-danger" onClick={() => run(onDelete)}>
                <span className="menu-item-symbol">✕</span>
                <span className="menu-item-label">Löschen</span>
            </button>
            {!isAtomic && (
                <>
                    <div className="menu-heading">Umwandeln in</div>
                    {CONVERTIBLE_TYPES.map(definition => (
                        <button
                            key={definition.type}
                            className={`menu-item ${definition.type === currentType ? 'is-active' : ''}`}
                            onClick={() => run(() => onConvert(definition.type))}
                        >
                            <span className="menu-item-symbol">{definition.symbol}</span>
                            <span className="menu-item-label">{definition.label}</span>
                        </button>
                    ))}
                </>
            )}
        </Popover>
    );
}
