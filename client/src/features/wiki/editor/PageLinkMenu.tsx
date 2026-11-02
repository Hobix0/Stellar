/* ==================================================================
   Stellar · Auswahl beim Tippen von „[[“ – verlinkt eine andere Seite
   Letzter Eintrag: neue Seite mit dem eingegebenen Titel anlegen.
   ================================================================== */

import { Popover, type PopoverAnchor } from '../../../components/ui/Popover';
import { pageDisplayTitle } from '../PagesContext';

/** Ein Eintrag im Menü: vorhandene Seite oder „neu anlegen“ */
export type PageLinkOption =
    | { kind: 'page'; pageId: number; title: string; icon: string | null }
    | { kind: 'create'; title: string };

interface PageLinkMenuProps {
    anchor: PopoverAnchor;
    options: PageLinkOption[];
    selectedIndex: number;
    onSelect: (option: PageLinkOption) => void;
    onClose: () => void;
}

export function PageLinkMenu({ anchor, options, selectedIndex, onSelect, onClose }: PageLinkMenuProps) {
    return (
        <Popover anchor={anchor} onClose={onClose} className="menu page-link-menu">
            <div className="menu-heading">Seite verlinken</div>
            {options.map((option, index) => (
                <button
                    key={option.kind === 'page' ? option.pageId : 'create'}
                    className={`menu-item ${index === selectedIndex ? 'is-active' : ''}`}
                    onMouseDown={event => {
                        event.preventDefault();
                        onSelect(option);
                    }}
                >
                    <span className="menu-item-symbol">{option.kind === 'page' ? option.icon ?? '📄' : '＋'}</span>
                    <span className="menu-item-label">
                        {option.kind === 'page' ? pageDisplayTitle(option) : `Neue Seite „${option.title}“`}
                    </span>
                </button>
            ))}
        </Popover>
    );
}
