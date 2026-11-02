/* ==================================================================
   Stellar · Verzögertes Speichern
   Sammelt Änderungen und speichert erst, wenn eine Weile Ruhe ist.
   Beim Verlassen der Seite (Unmount) wird Ausstehendes sofort gespeichert.
   ================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export function useDebouncedSave<Changes extends object>(
    save: (changes: Changes) => Promise<unknown>,
    delayMs = 700,
) {
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const pendingChanges = useRef<Changes | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Immer die aktuelle save-Funktion verwenden, ohne den Timer neu zu starten
    const saveRef = useRef(save);
    saveRef.current = save;

    const flush = useCallback(async () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        const changes = pendingChanges.current;
        if (!changes) return;
        pendingChanges.current = null;
        setSaveState('saving');
        try {
            await saveRef.current(changes);
            setSaveState(pendingChanges.current ? 'pending' : 'saved');
        } catch (error) {
            console.error(error);
            setSaveState('error');
        }
    }, []);

    /** Merkt Änderungen vor; mehrere Aufrufe werden zusammengefasst. */
    const schedule = useCallback(
        (changes: Changes) => {
            pendingChanges.current = { ...(pendingChanges.current ?? {}), ...changes } as Changes;
            setSaveState('pending');
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => void flush(), delayMs);
        },
        [delayMs, flush],
    );

    useEffect(() => () => void flush(), [flush]);

    return { schedule, flush, saveState };
}
