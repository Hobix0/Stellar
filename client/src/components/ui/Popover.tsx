/* ==================================================================
   Stellar · Schwebendes Menü an einer festen Bildschirmposition
   (für Slash-Menü, Block-Menü, Icon-Auswahl …)
   ================================================================== */

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface PopoverAnchor {
    left: number;
    top: number;
}

interface PopoverProps {
    anchor: PopoverAnchor;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}

export function Popover({ anchor, onClose, children, className = '' }: PopoverProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(anchor);
    const close = useCallback(() => onClose(), [onClose]);
    useClickOutside(ref, close);

    // Nicht über den Bildschirmrand hinausragen
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const { width, height } = element.getBoundingClientRect();
        const margin = 12;
        setPosition({
            left: Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin)),
            top: anchor.top + height > window.innerHeight - margin ? Math.max(margin, anchor.top - height - 28) : anchor.top,
        });
    }, [anchor.left, anchor.top]);

    return createPortal(
        <div ref={ref} className={`popover ${className}`} style={{ left: position.left, top: position.top }}>
            {children}
        </div>,
        document.body,
    );
}

/** Position direkt unter einem Element (z. B. einem Knopf) */
export function anchorBelow(element: Element): PopoverAnchor {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom + 6 };
}
