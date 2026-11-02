/* ==================================================================
   Stellar · Block-Editor einer Wiki-Seite
   Hält die Blockliste, verarbeitet Tastatur und Eingaben und zeigt die
   Menüs (Slash-Menü, [[Seitenlinks]], Blockmenü, Emoji-Auswahl).

   Ablauf beim Tippen:
     Browser ändert das contentEditable → onInput → handleInput
     → neue Blockliste über commit() an die Seite (die speichert verzögert)
   Fokus-Wechsel (Enter, Backspace, Pfeiltasten) laufen über
   pendingFocus: nach dem nächsten Rendern wird die Schreibmarke gesetzt.
   ================================================================== */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Block, BlockType } from '../../../../../shared/types';
import { wikiApi } from '../../../api/wikiApi';
import { IconPicker } from '../../../components/ui/IconPicker';
import { anchorBelow, type PopoverAnchor } from '../../../components/ui/Popover';
import { escapeHtml, htmlToText } from '../../../lib/html';
import { usePages } from '../PagesContext';
import { BlockMenu } from './BlockMenu';
import { filterBlockDefinitions, getBlockDefinition, matchMarkdownShortcut, type BlockDefinition } from './blockDefinitions';
import {
    computeListNumbers,
    convertBlock,
    createBlock,
    insertBlocksAfter,
    isTextBlock,
    moveBlock,
    removeBlockFrom,
    updateBlockIn,
} from './blockOperations';
import {
    caretScreenPosition,
    extractHtmlAfterCaret,
    getCaretOffset,
    getTextBeforeCaret,
    isCaretAtStart,
    isCaretOnEdgeLine,
    isSelectionCollapsed,
    placeCaret,
    rangeBetweenOffsets,
} from './caret';
import { EditableBlock, type DropPosition, type EditableBlockHandlers } from './EditableBlock';
import { PageLinkMenu, type PageLinkOption } from './PageLinkMenu';
import { SlashMenu } from './SlashMenu';

type CaretTarget = number | 'start' | 'end';

interface MenuAtBlock {
    blockId: string;
    anchor: PopoverAnchor;
}

interface SearchMenuState extends MenuAtBlock {
    query: string;
    selectedIndex: number;
}

interface BlockEditorProps {
    pageId: number;
    blocks: Block[];
    readOnly: boolean;
    onChange: (blocks: Block[]) => void;
}

const BLOCK_DRAG_MIME_TYPE = 'application/x-stellar-block';
/** „[[“ gefolgt vom Suchtext bis zur Schreibmarke */
const PAGE_LINK_TRIGGER = /\[\[([^[\]]{0,40})$/;
/** Text eines Blocks, der nur aus „/“ und Suchtext besteht */
const SLASH_TRIGGER = /^\/([^\n/]{0,24})$/;

export function BlockEditor({ pageId, blocks, readOnly, onChange }: BlockEditorProps) {
    const navigate = useNavigate();
    const { pages, reloadPages } = usePages();
    const containerRef = useRef<HTMLDivElement>(null);

    // Immer aktuelle Werte für die (stabilen) Ereignis-Handler
    const blocksRef = useRef(blocks);
    blocksRef.current = blocks;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const pendingFocus = useRef<{ blockId: string; caret: CaretTarget } | null>(null);
    const draggedBlockId = useRef<string | null>(null);

    const [slashMenu, setSlashMenu] = useState<SearchMenuState | null>(null);
    const [linkMenu, setLinkMenu] = useState<SearchMenuState | null>(null);
    const [blockMenu, setBlockMenu] = useState<MenuAtBlock | null>(null);
    const [emojiPicker, setEmojiPicker] = useState<MenuAtBlock | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ blockId: string; position: DropPosition } | null>(null);

    const slashMenuRef = useRef(slashMenu);
    slashMenuRef.current = slashMenu;
    const linkMenuRef = useRef(linkMenu);
    linkMenuRef.current = linkMenu;

    /* ---------------- Grundfunktionen ---------------- */

    /** Neue Blockliste übernehmen und optional danach die Schreibmarke setzen */
    const commit = (nextBlocks: Block[], focus?: { blockId: string; caret: CaretTarget }) => {
        blocksRef.current = nextBlocks;
        if (focus) pendingFocus.current = focus;
        onChangeRef.current(nextBlocks);
    };

    const findEditable = (blockId: string): HTMLElement | null =>
        containerRef.current?.querySelector<HTMLElement>(`[data-block-id="${blockId}"] [data-editable]`) ?? null;

    const focusBlock = (blockId: string, caret: CaretTarget) => {
        const element = findEditable(blockId);
        if (element) placeCaret(element, caret);
    };

    // Nach jedem Rendern: ausstehenden Fokuswunsch erfüllen
    useLayoutEffect(() => {
        const request = pendingFocus.current;
        if (!request) return;
        pendingFocus.current = null;
        focusBlock(request.blockId, request.caret);
    });

    // Drag-Anzeige aufräumen, falls außerhalb losgelassen wird
    useEffect(() => {
        const clearDrag = () => {
            draggedBlockId.current = null;
            setDropIndicator(null);
        };
        document.addEventListener('dragend', clearDrag);
        return () => document.removeEventListener('dragend', clearDrag);
    }, []);

    /** Nächster bzw. vorheriger Block mit Text (überspringt Trennlinien & Unterseiten) */
    const findNeighbourTextBlock = (index: number, direction: -1 | 1): Block | undefined => {
        for (let i = index + direction; i >= 0 && i < blocksRef.current.length; i += direction) {
            const candidate = blocksRef.current[i];
            if (candidate && isTextBlock(candidate)) return candidate;
        }
        return undefined;
    };

    /* ---------------- Menü-Optionen ---------------- */

    const slashOptions = slashMenu ? filterBlockDefinitions(slashMenu.query) : [];

    const buildLinkOptions = (query: string): PageLinkOption[] => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchingPages: PageLinkOption[] = pages
            .filter(page => page.id !== pageId && (page.title || 'ohne titel').toLowerCase().includes(normalizedQuery))
            .slice(0, 8)
            .map(page => ({ kind: 'page', pageId: page.id, title: page.title, icon: page.icon }));
        return normalizedQuery ? [...matchingPages, { kind: 'create', title: query.trim() }] : matchingPages;
    };
    const linkOptions = linkMenu ? buildLinkOptions(linkMenu.query) : [];

    /* ---------------- Eingabe ---------------- */

    const handleInput = (blockId: string, element: HTMLElement) => {
        const block = blocksRef.current.find(candidate => candidate.id === blockId);
        if (!block) return;
        const text = element.textContent ?? '';

        if (block.type === 'text') {
            // Markdown-Kürzel: „## “ → Überschrift 2 usw.
            const shortcut = matchMarkdownShortcut(text);
            if (shortcut) {
                // Schreibmarke bleibt hinter dem bisher Getippten (nur das Kürzel fällt weg)
                const caretAfterShortcut = Math.max(0, (getCaretOffset(element) ?? shortcut.length) - shortcut.length);
                rangeBetweenOffsets(element, 0, shortcut.length).deleteContents();
                const converted = convertBlock({ ...block, content: element.innerHTML }, shortcut.type);
                commit(updateBlockIn(blocksRef.current, blockId, converted), { blockId, caret: caretAfterShortcut });
                setSlashMenu(null);
                return;
            }
            // „---“ → Trennlinie, darunter geht es mit einem neuen Textblock weiter
            if (text === '---') {
                const nextBlock = createBlock();
                const withDivider = updateBlockIn(blocksRef.current, blockId, { type: 'divider', content: '' });
                commit(insertBlocksAfter(withDivider, blockId, [nextBlock]), { blockId: nextBlock.id, caret: 'start' });
                return;
            }
        }

        // Slash-Menü öffnen/filtern, solange der Block nur „/suchtext“ enthält
        const slashMatch = block.type !== 'code' ? SLASH_TRIGGER.exec(text) : null;
        if (slashMatch) {
            setSlashMenu(current => ({
                blockId,
                anchor: current?.blockId === blockId ? current.anchor : caretScreenPosition(element),
                query: slashMatch[1] ?? '',
                selectedIndex: 0,
            }));
        } else if (slashMenuRef.current?.blockId === blockId) {
            setSlashMenu(null);
        }

        // Seitenlink-Menü bei „[[“
        const linkMatch = block.type !== 'code' ? PAGE_LINK_TRIGGER.exec(getTextBeforeCaret(element)) : null;
        if (linkMatch) {
            setLinkMenu(current => ({
                blockId,
                anchor: current?.blockId === blockId ? current.anchor : caretScreenPosition(element),
                query: linkMatch[1] ?? '',
                selectedIndex: 0,
            }));
        } else if (linkMenuRef.current?.blockId === blockId) {
            setLinkMenu(null);
        }

        commit(updateBlockIn(blocksRef.current, blockId, { content: element.innerHTML }));
    };

    /* ---------------- Menü-Aktionen ---------------- */

    /** Eintrag im Slash-Menü gewählt: Block umwandeln (bzw. Unterseite anlegen) */
    const applySlashSelection = async (definition: BlockDefinition) => {
        const menu = slashMenuRef.current;
        setSlashMenu(null);
        if (!menu) return;
        const blockId = menu.blockId;
        const block = blocksRef.current.find(candidate => candidate.id === blockId);
        if (!block) return;

        if (definition.type === 'subpage') {
            const subpage = await wikiApi.createPage({ parentId: pageId });
            await reloadPages();
            commit(updateBlockIn(blocksRef.current, blockId, { type: 'subpage', content: '', pageId: subpage.id }));
            navigate(`/wiki/${subpage.id}`);
            return;
        }
        if (definition.type === 'divider') {
            const nextBlock = createBlock();
            const withDivider = updateBlockIn(blocksRef.current, blockId, { type: 'divider', content: '' });
            commit(insertBlocksAfter(withDivider, blockId, [nextBlock]), { blockId: nextBlock.id, caret: 'start' });
            return;
        }
        commit(updateBlockIn(blocksRef.current, blockId, convertBlock({ ...block, content: '' }, definition.type)), {
            blockId,
            caret: 'start',
        });
    };

    /** Eintrag im [[-Menü gewählt: „[[suchtext“ durch einen Seitenlink ersetzen */
    const applyPageLinkSelection = async (option: PageLinkOption) => {
        const menu = linkMenuRef.current;
        setLinkMenu(null);
        if (!menu) return;
        const element = findEditable(menu.blockId);
        const caretOffset = element ? getCaretOffset(element) : null;
        if (!element || caretOffset === null) return;

        // Bereich „[[suchtext“ jetzt festhalten: Ein Range wandert mit, falls während
        // des Anlegens einer neuen Seite schon weitergetippt wird.
        const triggerLength = 2 + menu.query.length;
        const range = rangeBetweenOffsets(element, caretOffset - triggerLength, caretOffset);

        let targetPageId: number;
        let targetTitle: string;
        if (option.kind === 'create') {
            const created = await wikiApi.createPage({ title: option.title });
            await reloadPages();
            targetPageId = created.id;
            targetTitle = option.title;
        } else {
            targetPageId = option.pageId;
            targetTitle = option.title.trim() || 'Ohne Titel';
        }

        // Steht die Schreibmarke noch direkt hinter „[[suchtext“, kommt sie danach hinter den Link
        const selection = window.getSelection();
        const caretStillAtTrigger = Boolean(
            selection?.isCollapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset,
        );
        range.deleteContents();

        const link = document.createElement('a');
        link.className = 'page-link';
        link.dataset.pageId = String(targetPageId);
        link.href = `/wiki/${targetPageId}`;
        link.contentEditable = 'false';
        link.textContent = targetTitle;
        const spaceAfterLink = document.createTextNode(' ');
        range.insertNode(spaceAfterLink);
        range.insertNode(link);

        if (caretStillAtTrigger) {
            element.focus();
            const caretRange = document.createRange();
            caretRange.setStartAfter(spaceAfterLink);
            caretRange.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(caretRange);
        }

        // Inzwischen erneut geöffnetes Menü (durch Weitertippen) schließen
        setLinkMenu(null);
        commit(updateBlockIn(blocksRef.current, menu.blockId, { content: element.innerHTML }));
    };

    /** Tastatur innerhalb eines offenen Such-Menüs (Slash oder [[) */
    const handleMenuKeys = <Option,>(
        event: KeyboardEvent<HTMLElement>,
        menu: SearchMenuState,
        options: Option[],
        setMenu: (state: SearchMenuState | null) => void,
        applySelection: (option: Option) => void,
    ): boolean => {
        const optionCount = Math.max(options.length, 1);
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setMenu({ ...menu, selectedIndex: (menu.selectedIndex + 1) % optionCount });
                return true;
            case 'ArrowUp':
                event.preventDefault();
                setMenu({ ...menu, selectedIndex: (menu.selectedIndex - 1 + optionCount) % optionCount });
                return true;
            case 'Enter':
            case 'Tab': {
                event.preventDefault();
                const option = options[menu.selectedIndex];
                if (option) applySelection(option);
                else setMenu(null);
                return true;
            }
            case 'Escape':
                event.preventDefault();
                setMenu(null);
                return true;
            default:
                return false;
        }
    };

    /* ---------------- Tastatur ---------------- */

    const handleEnter = (event: KeyboardEvent<HTMLElement>, block: Block, element: HTMLElement) => {
        if (block.type === 'code') {
            // Im Code-Block erzeugt Enter einen Zeilenumbruch statt eines neuen Blocks
            event.preventDefault();
            document.execCommand('insertText', false, '\n');
            return;
        }
        event.preventDefault();
        const definition = getBlockDefinition(block.type);

        // Leerer Listenpunkt + Enter beendet die Liste
        if (definition.continuesOnEnter && (element.textContent ?? '') === '') {
            commit(updateBlockIn(blocksRef.current, block.id, convertBlock(block, 'text')), { blockId: block.id, caret: 'start' });
            return;
        }

        // Block an der Schreibmarke teilen
        const tailHtml = extractHtmlAfterCaret(element);
        const headHtml = element.innerHTML;
        const newBlock = createBlock(definition.continuesOnEnter ? block.type : 'text', tailHtml);
        const updated = updateBlockIn(blocksRef.current, block.id, { content: headHtml });
        commit(insertBlocksAfter(updated, block.id, [newBlock]), { blockId: newBlock.id, caret: 'start' });
    };

    const handleBackspaceAtStart = (event: KeyboardEvent<HTMLElement>, block: Block, index: number) => {
        // Formatierte Blöcke werden zuerst zu normalem Text
        if (block.type !== 'text') {
            event.preventDefault();
            commit(updateBlockIn(blocksRef.current, block.id, convertBlock(block, 'text')), { blockId: block.id, caret: 'start' });
            return;
        }
        const previous = blocksRef.current[index - 1];
        if (!previous) return;
        event.preventDefault();

        if (!isTextBlock(previous)) {
            // Trennlinie/Unterseite davor einfach entfernen
            commit(removeBlockFrom(blocksRef.current, previous.id), { blockId: block.id, caret: 'start' });
            return;
        }
        // Mit dem vorherigen Block zusammenführen; die Schreibmarke steht an der Nahtstelle
        const seamOffset = htmlToText(previous.content).length;
        const merged = updateBlockIn(blocksRef.current, previous.id, { content: previous.content + block.content });
        commit(removeBlockFrom(merged, block.id), { blockId: previous.id, caret: seamOffset });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>, blockId: string, element: HTMLElement) => {
        const index = blocksRef.current.findIndex(candidate => candidate.id === blockId);
        const block = blocksRef.current[index];
        if (!block) return;

        const openSlashMenu = slashMenuRef.current;
        if (openSlashMenu?.blockId === blockId) {
            const options = filterBlockDefinitions(openSlashMenu.query);
            if (handleMenuKeys(event, openSlashMenu, options, setSlashMenu, option => void applySlashSelection(option))) return;
        }
        const openLinkMenu = linkMenuRef.current;
        if (openLinkMenu?.blockId === blockId) {
            const options = buildLinkOptions(openLinkMenu.query);
            if (handleMenuKeys(event, openLinkMenu, options, setLinkMenu, option => void applyPageLinkSelection(option))) return;
        }

        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            handleEnter(event, block, element);
        } else if (event.key === 'Backspace' && isCaretAtStart(element)) {
            handleBackspaceAtStart(event, block, index);
        } else if (event.key === 'ArrowUp' && isSelectionCollapsed() && isCaretOnEdgeLine(element, 'first')) {
            const previous = findNeighbourTextBlock(index, -1);
            if (previous) {
                event.preventDefault();
                focusBlock(previous.id, 'end');
            }
        } else if (event.key === 'ArrowDown' && isSelectionCollapsed() && isCaretOnEdgeLine(element, 'last')) {
            const next = findNeighbourTextBlock(index, 1);
            if (next) {
                event.preventDefault();
                focusBlock(next.id, 'start');
            }
        }
    };

    /* ---------------- Einfügen aus der Zwischenablage ---------------- */

    const handlePaste = (event: ClipboardEvent<HTMLElement>, blockId: string, element: HTMLElement) => {
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
        if (!text) return;
        const block = blocksRef.current.find(candidate => candidate.id === blockId);

        // Eine Zeile (oder Code): als reinen Text einfügen
        if (!text.includes('\n') || block?.type === 'code') {
            document.execCommand('insertText', false, text);
            return;
        }

        // Mehrere Zeilen: erste Zeile in den Block, jede weitere wird ein eigener Block
        // (Markdown-Kürzel wie „- “ oder „## “ werden dabei erkannt)
        const [firstLine = '', ...otherLines] = text.split('\n');
        document.execCommand('insertText', false, firstLine);
        const tailHtml = extractHtmlAfterCaret(element);
        const newBlocks = otherLines
            .filter(line => line.trim() !== '')
            .map(line => {
                const shortcut = matchMarkdownShortcut(line);
                const type: BlockType = shortcut?.type ?? 'text';
                return createBlock(type, escapeHtml(shortcut ? line.slice(shortcut.length) : line));
            });
        const lastBlock = newBlocks[newBlocks.length - 1];
        if (!lastBlock) return;
        const caretOffset = htmlToText(lastBlock.content).length;
        lastBlock.content += tailHtml;

        const updated = updateBlockIn(blocksRef.current, blockId, { content: element.innerHTML });
        commit(insertBlocksAfter(updated, blockId, newBlocks), { blockId: lastBlock.id, caret: caretOffset });
    };

    /* ---------------- Drag & Drop von Blöcken ---------------- */

    const handleDragStartBlock = (event: DragEvent, blockId: string) => {
        draggedBlockId.current = blockId;
        event.dataTransfer.setData(BLOCK_DRAG_MIME_TYPE, blockId);
        event.dataTransfer.effectAllowed = 'move';
        const blockElement = containerRef.current?.querySelector(`[data-block-id="${blockId}"]`);
        if (blockElement) event.dataTransfer.setDragImage(blockElement, 20, 16);
    };

    const handleDragOverBlock = (event: DragEvent, blockId: string) => {
        if (!draggedBlockId.current) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const position: DropPosition = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        setDropIndicator(current =>
            current?.blockId === blockId && current.position === position ? current : { blockId, position },
        );
    };

    const handleDropOnBlock = (event: DragEvent, blockId: string) => {
        const movedId = draggedBlockId.current;
        if (!movedId) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const position: DropPosition = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        commit(moveBlock(blocksRef.current, movedId, blockId, position));
        draggedBlockId.current = null;
        setDropIndicator(null);
    };

    /* ---------------- Sonstige Block-Aktionen ---------------- */

    const addBlockBelow = (blockId: string) => {
        // Neuer Block mit „/“ → das Slash-Menü öffnet sich direkt
        const newBlock = createBlock('text', '/');
        commit(insertBlocksAfter(blocksRef.current, blockId, [newBlock]), { blockId: newBlock.id, caret: 'end' });
        requestAnimationFrame(() => {
            const element = findEditable(newBlock.id);
            if (element) setSlashMenu({ blockId: newBlock.id, anchor: caretScreenPosition(element), query: '', selectedIndex: 0 });
        });
    };

    /** Klick unter den letzten Block: dort weiterschreiben */
    const handleTailClick = () => {
        const lastBlock = blocksRef.current[blocksRef.current.length - 1];
        if (lastBlock && lastBlock.type === 'text' && htmlToText(lastBlock.content) === '') {
            focusBlock(lastBlock.id, 'end');
            return;
        }
        const newBlock = createBlock();
        commit([...blocksRef.current, newBlock], { blockId: newBlock.id, caret: 'start' });
    };

    /** Klick auf Links im Text: interne Seitenlinks öffnen, externe mit Strg/Cmd im neuen Tab */
    const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
        const link = (event.target as Element).closest('a');
        if (!link) return;
        if (link.classList.contains('page-link') && link.dataset.pageId) {
            event.preventDefault();
            navigate(`/wiki/${link.dataset.pageId}`);
        } else if (!readOnly && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            window.open(link.href, '_blank', 'noopener');
        }
    };

    // Aktuelle Funktionen in einem Ref, damit die Handler für memo-Blöcke stabil bleiben
    const actionsRef = useRef({ handleInput, handleKeyDown, handlePaste, handleDragStartBlock, handleDragOverBlock, handleDropOnBlock, addBlockBelow });
    actionsRef.current = { handleInput, handleKeyDown, handlePaste, handleDragStartBlock, handleDragOverBlock, handleDropOnBlock, addBlockBelow };

    const handlers = useMemo<EditableBlockHandlers>(
        () => ({
            onInput: (...args) => actionsRef.current.handleInput(...args),
            onKeyDown: (...args) => actionsRef.current.handleKeyDown(...args),
            onPaste: (...args) => actionsRef.current.handlePaste(...args),
            onToggleChecked: blockId => {
                const block = blocksRef.current.find(candidate => candidate.id === blockId);
                if (block) commit(updateBlockIn(blocksRef.current, blockId, { checked: !block.checked }));
            },
            onEmojiClick: (blockId, button) => setEmojiPicker({ blockId, anchor: anchorBelow(button) }),
            onOpenBlockMenu: (blockId, button) => setBlockMenu({ blockId, anchor: anchorBelow(button) }),
            onAddBlockBelow: blockId => actionsRef.current.addBlockBelow(blockId),
            onDragStartBlock: (...args) => actionsRef.current.handleDragStartBlock(...args),
            onDragOverBlock: (...args) => actionsRef.current.handleDragOverBlock(...args),
            onDropOnBlock: (...args) => actionsRef.current.handleDropOnBlock(...args),
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- alles läuft über Refs
        [],
    );

    /* ---------------- Darstellung ---------------- */

    const listNumbers = computeListNumbers(blocks);
    const blockForMenu = blockMenu ? blocks.find(block => block.id === blockMenu.blockId) : undefined;

    return (
        <div className={`block-editor ${readOnly ? 'is-read-only' : ''}`} ref={containerRef} onClick={handleContainerClick}>
            {blocks.map(block => (
                <EditableBlock
                    key={block.id}
                    block={block}
                    listNumber={listNumbers.get(block.id) ?? 0}
                    readOnly={readOnly}
                    dropIndicator={dropIndicator?.blockId === block.id ? dropIndicator.position : null}
                    handlers={handlers}
                />
            ))}
            {!readOnly && <div className="block-editor-tail" onClick={handleTailClick} />}

            {slashMenu && (
                <SlashMenu
                    anchor={slashMenu.anchor}
                    options={slashOptions}
                    selectedIndex={slashMenu.selectedIndex}
                    onSelect={definition => void applySlashSelection(definition)}
                    onClose={() => setSlashMenu(null)}
                />
            )}
            {linkMenu && linkOptions.length > 0 && (
                <PageLinkMenu
                    anchor={linkMenu.anchor}
                    options={linkOptions}
                    selectedIndex={linkMenu.selectedIndex}
                    onSelect={option => void applyPageLinkSelection(option)}
                    onClose={() => setLinkMenu(null)}
                />
            )}
            {blockMenu && blockForMenu && (
                <BlockMenu
                    anchor={blockMenu.anchor}
                    currentType={blockForMenu.type}
                    onConvert={type =>
                        commit(updateBlockIn(blocksRef.current, blockForMenu.id, convertBlock(blockForMenu, type)), {
                            blockId: blockForMenu.id,
                            caret: 'end',
                        })
                    }
                    onDuplicate={() =>
                        commit(insertBlocksAfter(blocksRef.current, blockForMenu.id, [{ ...blockForMenu, ...createBlockIdOnly() }]))
                    }
                    onDelete={() => commit(removeBlockFrom(blocksRef.current, blockForMenu.id))}
                    onClose={() => setBlockMenu(null)}
                />
            )}
            {emojiPicker && (
                <IconPicker
                    anchor={emojiPicker.anchor}
                    onSelect={icon => commit(updateBlockIn(blocksRef.current, emojiPicker.blockId, { emoji: icon ?? '💡' }))}
                    onClose={() => setEmojiPicker(null)}
                />
            )}
        </div>
    );
}

/** Nur eine neue ID – für das Duplizieren eines Blocks */
function createBlockIdOnly(): Pick<Block, 'id'> {
    return { id: createBlock().id };
}
