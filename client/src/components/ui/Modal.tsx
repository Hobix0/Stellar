/* ==================================================================
   Stellar · Dialogfenster mit abgedunkeltem Hintergrund
   Schließt per Escape oder Klick neben den Dialog.
   ================================================================== */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface ModalProps {
    title?: string;
    onClose: () => void;
    children: ReactNode;
    /** Breite des Dialogs */
    size?: 'small' | 'medium' | 'large';
}

export function Modal({ title, onClose, children, size = 'medium' }: ModalProps) {
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return createPortal(
        <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
                {title && (
                    <header className="modal-header">
                        <h2>{title}</h2>
                        <button className="icon-button" onClick={onClose} aria-label="Schließen">
                            <Icon name="close" />
                        </button>
                    </header>
                )}
                <div className="modal-body">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
