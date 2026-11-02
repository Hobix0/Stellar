/* ==================================================================
   Stellar · Reine Funktionen zum Ändern der Blockliste
   Sie verändern nichts, sondern geben immer eine neue Liste zurück.
   ================================================================== */

import type { Block, BlockType } from '../../../../../shared/types';
import { createBlockId } from '../../../lib/ids';

export function createBlock(type: BlockType = 'text', content = ''): Block {
    const block: Block = { id: createBlockId(), type, content };
    if (type === 'todo') block.checked = false;
    if (type === 'callout') block.emoji = '💡';
    return block;
}

export function updateBlockIn(blocks: Block[], blockId: string, changes: Partial<Block>): Block[] {
    return blocks.map(block => (block.id === blockId ? { ...block, ...changes } : block));
}

export function insertBlocksAfter(blocks: Block[], afterBlockId: string, newBlocks: Block[]): Block[] {
    const index = blocks.findIndex(block => block.id === afterBlockId);
    if (index === -1) return [...blocks, ...newBlocks];
    return [...blocks.slice(0, index + 1), ...newBlocks, ...blocks.slice(index + 1)];
}

export function removeBlockFrom(blocks: Block[], blockId: string): Block[] {
    const remaining = blocks.filter(block => block.id !== blockId);
    // Eine Seite hat immer mindestens einen (leeren) Textblock
    return remaining.length > 0 ? remaining : [createBlock()];
}

/** Verschiebt einen Block vor oder hinter einen anderen (Drag & Drop) */
export function moveBlock(blocks: Block[], movedBlockId: string, targetBlockId: string, position: 'before' | 'after'): Block[] {
    if (movedBlockId === targetBlockId) return blocks;
    const moved = blocks.find(block => block.id === movedBlockId);
    if (!moved) return blocks;
    const withoutMoved = blocks.filter(block => block.id !== movedBlockId);
    const targetIndex = withoutMoved.findIndex(block => block.id === targetBlockId);
    if (targetIndex === -1) return blocks;
    const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
    return [...withoutMoved.slice(0, insertAt), moved, ...withoutMoved.slice(insertAt)];
}

/** Wandelt einen Block in einen anderen Typ um; typfremde Felder werden entfernt */
export function convertBlock(block: Block, type: BlockType): Block {
    const converted: Block = { id: block.id, type, content: type === 'code' ? block.content.replace(/<[^>]*>/g, '') : block.content };
    if (type === 'todo') converted.checked = block.checked ?? false;
    if (type === 'callout') converted.emoji = block.emoji ?? '💡';
    return converted;
}

/** Nummer jedes Blocks in einer nummerierten Liste (zählt neu nach jeder Unterbrechung) */
export function computeListNumbers(blocks: Block[]): Map<string, number> {
    const numbers = new Map<string, number>();
    let counter = 0;
    for (const block of blocks) {
        counter = block.type === 'numberedList' ? counter + 1 : 0;
        if (counter > 0) numbers.set(block.id, counter);
    }
    return numbers;
}

/** Hat der Block eigenen Text? (nicht bei Trennlinie und Unterseite) */
export function isTextBlock(block: Block | undefined): boolean {
    return Boolean(block && block.type !== 'divider' && block.type !== 'subpage');
}
