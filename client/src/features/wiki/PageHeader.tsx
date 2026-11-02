/* ==================================================================
   Stellar · Kopf einer Seite: Icon, Titel, Favorit, Speicherstatus, Menü
   ================================================================== */

import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { IconPicker } from '../../components/ui/IconPicker';
import { anchorBelow, Popover, type PopoverAnchor } from '../../components/ui/Popover';
import type { SaveState } from '../../hooks/useDebouncedSave';

const SAVE_STATE_LABELS: Record<SaveState, string> = {
    idle: '',
    pending: 'Ungespeichert …',
    saving: 'Speichert …',
    saved: 'Gespeichert',
    error: 'Speichern fehlgeschlagen',
};

interface PageHeaderProps {
    title: string;
    icon: string | null;
    isFavorite: boolean;
    readOnly: boolean;
    saveState: SaveState;
    onTitleChange: (title: string) => void;
    /** Enter im Titel → in den ersten Block springen */
    onTitleEnter: () => void;
    onIconChange: (icon: string | null) => void;
    onToggleFavorite: () => void;
    onMoveToTrash: () => void;
}

export function PageHeader(props: PageHeaderProps) {
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const [iconPickerAnchor, setIconPickerAnchor] = useState<PopoverAnchor | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<PopoverAnchor | null>(null);

    // Titelfeld wächst mit dem Text mit (mehrzeilige Titel).
    // Neu messen bei Textänderung und wenn sich die Breite ändert (Fenster, Seitenleiste).
    useLayoutEffect(() => {
        const textarea = titleRef.current;
        if (!textarea) return;
        const fitHeight = () => {
            textarea.style.height = '0px';
            textarea.style.height = `${textarea.scrollHeight}px`;
        };
        fitHeight();
        let lastWidth = textarea.clientWidth;
        const observer = new ResizeObserver(() => {
            if (textarea.clientWidth === lastWidth) return;
            lastWidth = textarea.clientWidth;
            fitHeight();
        });
        observer.observe(textarea);
        return () => observer.disconnect();
    }, [props.title]);

    return (
        <header className="page-header">
            <div className="page-header-toolbar">
                <span className={`save-state save-state-${props.saveState}`}>{SAVE_STATE_LABELS[props.saveState]}</span>
                {!props.readOnly && (
                    <>
                        <button
                            className={`icon-button ${props.isFavorite ? 'is-active' : ''}`}
                            title={props.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
                            onClick={props.onToggleFavorite}
                        >
                            <Icon name="star" />
                        </button>
                        <button className="icon-button" title="Weitere Aktionen" onClick={event => setMenuAnchor(anchorBelow(event.currentTarget))}>
                            <Icon name="more" />
                        </button>
                    </>
                )}
            </div>

            <button
                className={`page-icon ${props.icon ? '' : 'is-empty'}`}
                disabled={props.readOnly}
                title="Icon ändern"
                onClick={event => setIconPickerAnchor(anchorBelow(event.currentTarget))}
            >
                {props.icon ?? '＋ Icon'}
            </button>

            <textarea
                ref={titleRef}
                className="page-title"
                rows={1}
                placeholder="Ohne Titel"
                value={props.title}
                readOnly={props.readOnly}
                onChange={event => props.onTitleChange(event.target.value.replace(/\n/g, ' '))}
                onKeyDown={event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        props.onTitleEnter();
                    }
                }}
            />

            {iconPickerAnchor && (
                <IconPicker anchor={iconPickerAnchor} onSelect={props.onIconChange} onClose={() => setIconPickerAnchor(null)} />
            )}
            {menuAnchor && (
                <Popover anchor={menuAnchor} onClose={() => setMenuAnchor(null)} className="menu">
                    <button
                        className="menu-item menu-item-danger"
                        onClick={() => {
                            setMenuAnchor(null);
                            props.onMoveToTrash();
                        }}
                    >
                        <span className="menu-item-symbol">
                            <Icon name="trash" size={15} />
                        </span>
                        <span className="menu-item-label">In den Papierkorb</span>
                    </button>
                </Popover>
            )}
        </header>
    );
}
