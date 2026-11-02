/* ==================================================================
   Stellar · Gemeinsame Typen für Server und Browser
   Diese Datei enthält nur Typen und Konstanten ohne Abhängigkeiten,
   damit beide Seiten (Express-Server und React-Client) sie nutzen können.
   ================================================================== */

/* ------------------------------------------------------------------ */
/*  Wiki                                                              */
/* ------------------------------------------------------------------ */

/** Alle Blocktypen, die der Editor kennt. */
export const BLOCK_TYPES = [
    'text',
    'heading1',
    'heading2',
    'heading3',
    'bulletList',
    'numberedList',
    'todo',
    'quote',
    'callout',
    'code',
    'divider',
    'subpage',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * Ein Block einer Seite.
 * `content` ist HTML mit wenigen erlaubten Inline-Elementen (fett, kursiv, Links …).
 */
export interface Block {
    id: string;
    type: BlockType;
    content: string;
    /** Nur bei `todo`: abgehakt? */
    checked?: boolean;
    /** Nur bei `callout`: Emoji am Anfang */
    emoji?: string;
    /** Nur bei `subpage`: verlinkte Unterseite */
    pageId?: number;
}

/** Kurzform einer Seite für Seitenleiste, Suche und Listen. */
export interface PageSummary {
    id: number;
    parentId: number | null;
    title: string;
    icon: string | null;
    isFavorite: boolean;
    position: number;
    updatedAt: string;
    /** Gesetzt (JJJJ-MM-TT), wenn die Seite die Tagesnotiz dieses Tages ist */
    dailyDate: string | null;
}

/** Vollständige Seite inkl. Inhalt. */
export interface Page extends PageSummary {
    blocks: Block[];
    createdAt: string;
    deletedAt: string | null;
}

/** Eine Seite, die auf die aktuelle Seite verlinkt (Rückverweis). */
export interface Backlink {
    id: number;
    title: string;
    icon: string | null;
}

export interface SearchResult {
    id: number;
    title: string;
    icon: string | null;
    /** Textausschnitt mit <mark>…</mark> um die Treffer */
    snippet: string;
}

/* ------------------------------------------------------------------ */
/*  Inbox                                                             */
/* ------------------------------------------------------------------ */

/** Schnell notierter Gedanke, der noch einsortiert werden muss */
export interface InboxItem {
    id: number;
    text: string;
    createdAt: string;
}

/** Wohin ein Inbox-Eintrag verschoben wird */
export type InboxTarget =
    | { kind: 'daily'; date: string }
    | { kind: 'page'; pageId: number }
    | { kind: 'task'; projectId: number };

/* ------------------------------------------------------------------ */
/*  Projekte                                                          */
/* ------------------------------------------------------------------ */

export const PROJECT_STATUSES = ['active', 'paused', 'done', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    active: 'Aktiv',
    paused: 'Pausiert',
    done: 'Abgeschlossen',
    archived: 'Archiviert',
};

export const TASK_STATUSES = ['todo', 'doing', 'review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'Offen',
    doing: 'In Arbeit',
    review: 'Prüfung',
    done: 'Erledigt',
};

/** Priorität: 0 = keine, 1 = niedrig, 2 = mittel, 3 = hoch */
export const TASK_PRIORITIES = [0, 1, 2, 3] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
    0: 'Keine',
    1: 'Niedrig',
    2: 'Mittel',
    3: 'Hoch',
};

/** Farbnamen, die Projekte und Labels annehmen können (CSS-Klassen im Client). */
export const COLOR_NAMES = ['gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink'] as const;
export type ColorName = (typeof COLOR_NAMES)[number];

export interface Project {
    id: number;
    name: string;
    description: string;
    color: ColorName;
    icon: string | null;
    status: ProjectStatus;
    startDate: string | null;
    dueDate: string | null;
    /** Verknüpfte Wiki-Seite (z. B. Projektdokumentation) */
    pageId: number | null;
    position: number;
    createdAt: string;
    updatedAt: string;
    /** Zähler für die Übersicht */
    taskCount: number;
    doneTaskCount: number;
}

export interface Label {
    id: number;
    name: string;
    color: ColorName;
}

export interface ChecklistItem {
    id: number;
    taskId: number;
    text: string;
    done: boolean;
    position: number;
}

export interface Task {
    id: number;
    projectId: number;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    startDate: string | null;
    dueDate: string | null;
    pageId: number | null;
    position: number;
    createdAt: string;
    updatedAt: string;
    doneAt: string | null;
    labelIds: number[];
    checklistTotal: number;
    checklistDone: number;
}

/** Aufgabe mit allen Details für den Aufgaben-Dialog. */
export interface TaskDetail extends Task {
    checklist: ChecklistItem[];
}

/* ------------------------------------------------------------------ */
/*  API-Eingaben (was der Client an den Server schickt)               */
/* ------------------------------------------------------------------ */

export type PageInput = Partial<Pick<Page, 'title' | 'icon' | 'blocks' | 'isFavorite' | 'parentId'>>;

export type ProjectInput = Partial<
    Pick<Project, 'name' | 'description' | 'color' | 'icon' | 'status' | 'startDate' | 'dueDate' | 'pageId'>
>;

export type TaskInput = Partial<
    Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'startDate' | 'dueDate' | 'pageId' | 'labelIds'>
>;

/** Neue Reihenfolge der Aufgaben einer Spalte im Board. */
export interface TaskReorderInput {
    status: TaskStatus;
    taskIds: number[];
}
