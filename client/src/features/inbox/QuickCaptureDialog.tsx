/* ==================================================================
   Stellar · Schnell-Notiz von überall (Alt + N oder Knopf in der Seitenleiste)
   ================================================================== */

import { Modal } from '../../components/ui/Modal';
import { CaptureForm } from './CaptureForm';
import { useInbox } from './InboxContext';

export function QuickCaptureDialog() {
    const { isCaptureOpen, setCaptureOpen } = useInbox();
    if (!isCaptureOpen) return null;

    return (
        <Modal title="Schnell notieren" size="medium" onClose={() => setCaptureOpen(false)}>
            <CaptureForm autoFocus onSaved={() => setCaptureOpen(false)} />
            <p className="muted capture-hint">Landet in der Inbox – einsortieren kannst du später.</p>
        </Modal>
    );
}
