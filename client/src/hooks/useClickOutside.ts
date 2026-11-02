import { useEffect, type RefObject } from 'react';

/** Ruft `onOutside` auf, wenn außerhalb des Elements geklickt oder Escape gedrückt wird (für Menüs). */
export function useClickOutside(ref: RefObject<HTMLElement>, onOutside: () => void, active = true): void {
    useEffect(() => {
        if (!active) return;
        const handlePointer = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onOutside();
        };
        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [ref, onOutside, active]);
}
