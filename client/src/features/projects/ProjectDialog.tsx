/* ==================================================================
   Stellar · Dialog zum Anlegen und Bearbeiten eines Projekts
   ================================================================== */

import { useState, type FormEvent } from 'react';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ColorName, type Project, type ProjectInput, type ProjectStatus } from '../../../../shared/types';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { IconPicker } from '../../components/ui/IconPicker';
import { Modal } from '../../components/ui/Modal';
import { anchorBelow, type PopoverAnchor } from '../../components/ui/Popover';

interface ProjectDialogProps {
    /** Vorhandenes Projekt bearbeiten; ohne = neues Projekt anlegen */
    project?: Project;
    onSubmit: (input: ProjectInput & { name: string }) => Promise<void>;
    onClose: () => void;
}

export function ProjectDialog({ project, onSubmit, onClose }: ProjectDialogProps) {
    const [name, setName] = useState(project?.name ?? '');
    const [description, setDescription] = useState(project?.description ?? '');
    const [icon, setIcon] = useState<string | null>(project?.icon ?? '🚀');
    const [color, setColor] = useState<ColorName>(project?.color ?? 'blue');
    const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active');
    const [startDate, setStartDate] = useState(project?.startDate ?? '');
    const [dueDate, setDueDate] = useState(project?.dueDate ?? '');
    const [iconPickerAnchor, setIconPickerAnchor] = useState<PopoverAnchor | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setErrorMessage('Bitte einen Namen eingeben.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit({
                name: name.trim(),
                description,
                icon,
                color,
                status,
                // Leere Datumsfelder → null (Datum entfernen)
                startDate: startDate || null,
                dueDate: dueDate || null,
            });
            onClose();
        } catch (error) {
            setErrorMessage((error as Error).message);
            setIsSubmitting(false);
        }
    };

    return (
        <Modal title={project ? 'Projekt bearbeiten' : 'Neues Projekt'} onClose={onClose}>
            <form className="form" onSubmit={event => void submit(event)}>
                <div className="form-row form-row-inline">
                    <button type="button" className="icon-select" onClick={event => setIconPickerAnchor(anchorBelow(event.currentTarget))}>
                        {icon ?? '📁'}
                    </button>
                    <input
                        className="input input-large"
                        placeholder="Projektname"
                        autoFocus
                        value={name}
                        onChange={event => setName(event.target.value)}
                    />
                </div>
                <label className="form-row">
                    <span className="form-label">Beschreibung</span>
                    <textarea className="input" rows={3} value={description} onChange={event => setDescription(event.target.value)} />
                </label>
                <div className="form-row">
                    <span className="form-label">Farbe</span>
                    <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="form-grid">
                    <label className="form-row">
                        <span className="form-label">Status</span>
                        <select className="input" value={status} onChange={event => setStatus(event.target.value as ProjectStatus)}>
                            {PROJECT_STATUSES.map(option => (
                                <option key={option} value={option}>
                                    {PROJECT_STATUS_LABELS[option]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="form-row">
                        <span className="form-label">Start</span>
                        <input type="date" className="input" value={startDate} onChange={event => setStartDate(event.target.value)} />
                    </label>
                    <label className="form-row">
                        <span className="form-label">Fällig</span>
                        <input type="date" className="input" value={dueDate} onChange={event => setDueDate(event.target.value)} />
                    </label>
                </div>
                {errorMessage && <p className="form-error">{errorMessage}</p>}
                <div className="form-actions">
                    <button type="button" className="button button-ghost" onClick={onClose}>
                        Abbrechen
                    </button>
                    <button type="submit" className="button button-primary" disabled={isSubmitting}>
                        {project ? 'Speichern' : 'Anlegen'}
                    </button>
                </div>
            </form>
            {iconPickerAnchor && <IconPicker anchor={iconPickerAnchor} onSelect={setIcon} onClose={() => setIconPickerAnchor(null)} />}
        </Modal>
    );
}
