/* ==================================================================
   Stellar · Eingabefeld für einen neuen Inbox-Eintrag
   Enter speichert, Umschalt + Enter macht eine neue Zeile.
   ================================================================== */

import { useState } from 'react';
import { useInbox } from './InboxContext';

interface CaptureFormProps {
    autoFocus?: boolean;
    /** Nach dem Speichern (z. B. Dialog schließen) */
    onSaved?: () => void;
}

export function CaptureForm({ autoFocus = false, onSaved }: CaptureFormProps) {
    const { addItem } = useInbox();
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const save = async () => {
        const trimmed = text.trim();
        if (!trimmed || isSaving) return;
        setIsSaving(true);
        try {
            await addItem(trimmed);
            setText('');
            onSaved?.();
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form
            className="capture-form"
            onSubmit={event => {
                event.preventDefault();
                void save();
            }}
        >
            <textarea
                className="input capture-input"
                rows={2}
                autoFocus={autoFocus}
                placeholder="Was geht dir durch den Kopf? (Enter speichert, Umschalt + Enter = neue Zeile)"
                value={text}
                onChange={event => setText(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        void save();
                    }
                }}
            />
            <button type="submit" className="button button-primary" disabled={!text.trim() || isSaving}>
                In die Inbox
            </button>
        </form>
    );
}
