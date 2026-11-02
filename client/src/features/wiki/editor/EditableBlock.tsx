/* ==================================================================
   Stellar · Ein einzelner Block im Editor
   Der Text ist ein „unkontrolliertes“ contentEditable-Element: React
   setzt den Inhalt nur, wenn er sich von außen ändert (Teilen, Zusammenführen,
   Typ-Wechsel). Tippen läuft direkt im Browser und wird per onInput gemeldet.
   ================================================================== */

import { memo, useLayoutEffect, useRef, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import type { Block } from '../../../../../shared/types';
import { Icon } from '../../../components/ui/Icon';
import { isEmptyHtml } from '../../../lib/html';
import { getBlockDefinition } from './blockDefinitions';
import { SubpageBlock } from './SubpageBlock';

export type DropPosition = 'before' | 'after';

export interface EditableBlockHandlers {
    onInput: (blockId: string, element: HTMLElement) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>, blockId: string, element: HTMLElement) => void;
    onPaste: (event: ClipboardEvent<HTMLElement>, blockId: string, element: HTMLElement) => void;
    onToggleChecked: (blockId: string) => void;
    onEmojiClick: (blockId: string, button: HTMLElement) => void;
    onOpenBlockMenu: (blockId: string, button: HTMLElement) => void;
    onAddBlockBelow: (blockId: string) => void;
    onDragStartBlock: (event: DragEvent, blockId: string) => void;
    onDragOverBlock: (event: DragEvent, blockId: string) => void;
    onDropOnBlock: (event: DragEvent, blockId: string) => void;
}

interface EditableBlockProps {
    block: Block;
    /** Laufende Nummer bei nummerierten Listen */
    listNumber: number;
    readOnly: boolean;
    dropIndicator: DropPosition | null;
    handlers: EditableBlockHandlers;
}

/** CSS-Klasse und HTML-Element je Blocktyp */
const TEXT_TAG_BY_TYPE: Partial<Record<Block['type'], 'h1' | 'h2' | 'h3' | 'blockquote' | 'pre'>> = {
    heading1: 'h1',
    heading2: 'h2',
    heading3: 'h3',
    quote: 'blockquote',
    code: 'pre',
};

function EditableBlockComponent({ block, listNumber, readOnly, dropIndicator, handlers }: EditableBlockProps) {
    const editableRef = useRef<HTMLElement>(null);

    // Inhalt nur setzen, wenn er sich vom DOM unterscheidet – sonst springt die Schreibmarke
    useLayoutEffect(() => {
        const element = editableRef.current;
        if (element && element.innerHTML !== block.content) element.innerHTML = block.content;
    }, [block.content, block.type]);

    const definition = getBlockDefinition(block.type);
    const TextTag = TEXT_TAG_BY_TYPE[block.type] ?? 'div';

    const renderBody = () => {
        if (block.type === 'divider') return <hr className="block-divider" />;
        if (block.type === 'subpage') return <SubpageBlock pageId={block.pageId} />;

        return (
            <TextTag
                ref={editableRef as React.RefObject<never>}
                className={`block-text ${isEmptyHtml(block.content) ? 'is-empty' : ''}`}
                data-editable="true"
                data-placeholder={definition.placeholder ?? 'Tippe „/“ für Befehle …'}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                spellCheck
                onInput={event => handlers.onInput(block.id, event.currentTarget)}
                onKeyDown={event => handlers.onKeyDown(event, block.id, event.currentTarget)}
                onPaste={event => handlers.onPaste(event, block.id, event.currentTarget)}
            />
        );
    };

    return (
        <div
            className={`block block--${block.type} ${block.checked ? 'is-checked' : ''} ${dropIndicator ? `drop-${dropIndicator}` : ''}`}
            data-block-id={block.id}
            onDragOver={event => handlers.onDragOverBlock(event, block.id)}
            onDrop={event => handlers.onDropOnBlock(event, block.id)}
        >
            {!readOnly && (
                <div className="block-handle" contentEditable={false}>
                    <button className="block-handle-button" title="Block darunter einfügen" onClick={() => handlers.onAddBlockBelow(block.id)}>
                        <Icon name="plus" size={15} />
                    </button>
                    <button
                        className="block-handle-button"
                        title="Ziehen zum Verschieben, Klicken für das Menü"
                        draggable
                        onDragStart={event => handlers.onDragStartBlock(event, block.id)}
                        onClick={event => handlers.onOpenBlockMenu(block.id, event.currentTarget)}
                    >
                        <Icon name="grip" size={15} />
                    </button>
                </div>
            )}

            {/* Vorspann je Typ: Punkt, Nummer, Checkbox, Emoji */}
            {block.type === 'bulletList' && <span className="block-marker">•</span>}
            {block.type === 'numberedList' && <span className="block-marker">{listNumber}.</span>}
            {block.type === 'todo' && (
                <input
                    type="checkbox"
                    className="block-checkbox"
                    checked={Boolean(block.checked)}
                    disabled={readOnly}
                    onChange={() => handlers.onToggleChecked(block.id)}
                />
            )}
            {block.type === 'callout' && (
                <button
                    className="block-callout-emoji"
                    disabled={readOnly}
                    onClick={event => handlers.onEmojiClick(block.id, event.currentTarget)}
                >
                    {block.emoji ?? '💡'}
                </button>
            )}

            <div className="block-body">{renderBody()}</div>
        </div>
    );
}

/** Nur neu zeichnen, wenn sich dieser Block (oder seine Anzeige) ändert */
export const EditableBlock = memo(EditableBlockComponent);
