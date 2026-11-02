/* ==================================================================
   Stellar · Gemeinsamer Zustand der Inbox
   Seitenleiste (Zähler), Schnell-Notiz und Inbox-Ansicht teilen ihn.
   ================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { InboxItem, InboxTarget } from '../../../../shared/types';
import { inboxApi, type InboxMoveResult } from '../../api/inboxApi';

interface InboxContextValue {
    items: InboxItem[];
    isLoaded: boolean;
    addItem: (text: string) => Promise<InboxItem>;
    updateItem: (itemId: number, text: string) => Promise<void>;
    deleteItem: (itemId: number) => Promise<void>;
    moveItem: (itemId: number, target: InboxTarget) => Promise<InboxMoveResult>;
    /** Schnell-Notiz-Dialog öffnen/schließen (Alt + N, Seitenleiste) */
    isCaptureOpen: boolean;
    setCaptureOpen: (open: boolean) => void;
}

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<InboxItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isCaptureOpen, setCaptureOpen] = useState(false);

    useEffect(() => {
        inboxApi
            .listItems()
            .then(loaded => {
                setItems(loaded);
                setIsLoaded(true);
            })
            .catch(console.error);
    }, []);

    const addItem = useCallback(async (text: string) => {
        const created = await inboxApi.createItem(text);
        setItems(current => [created, ...current]);
        return created;
    }, []);

    const updateItem = useCallback(async (itemId: number, text: string) => {
        const updated = await inboxApi.updateItem(itemId, text);
        setItems(current => current.map(item => (item.id === itemId ? updated : item)));
    }, []);

    const deleteItem = useCallback(async (itemId: number) => {
        await inboxApi.deleteItem(itemId);
        setItems(current => current.filter(item => item.id !== itemId));
    }, []);

    const moveItem = useCallback(async (itemId: number, target: InboxTarget) => {
        const result = await inboxApi.moveItem(itemId, target);
        setItems(current => current.filter(item => item.id !== itemId));
        return result;
    }, []);

    const value = useMemo<InboxContextValue>(
        () => ({ items, isLoaded, addItem, updateItem, deleteItem, moveItem, isCaptureOpen, setCaptureOpen }),
        [items, isLoaded, addItem, updateItem, deleteItem, moveItem, isCaptureOpen],
    );

    return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextValue {
    const context = useContext(InboxContext);
    if (!context) throw new Error('useInbox muss innerhalb von <InboxProvider> verwendet werden');
    return context;
}
