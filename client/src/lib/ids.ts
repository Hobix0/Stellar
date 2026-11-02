/** Zufällige ID für neue Blöcke (gleiches Format wie auf dem Server). */
export function createBlockId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
