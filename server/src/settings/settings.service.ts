/* ==================================================================
   Stellar · Einstellungen für Anbindungen (Token, Home Assistant, Briefing)
   Liegen in der Datenbank (app_state) und sind in der Oberfläche änderbar –
   auf Umbrel lassen sich Umgebungsvariablen nicht dauerhaft setzen.
   Ist eine Umgebungsvariable gesetzt, hat sie Vorrang und das Feld ist
   in der Oberfläche gesperrt.
   ================================================================== */

import { randomBytes } from 'node:crypto';
import { MIN_API_TOKEN_LENGTH } from '../config';
import { queryOne, queryRows } from '../db/pool';

export interface Settings {
    apiToken: string;
    timeZone: string;
    publicUrl: string;
    haUrl: string;
    haToken: string;
    haNotifyService: string;
    haBriefingEntities: string[];
    /** 'HH:MM' oder null = kein Briefing */
    briefingWeekday: string | null;
    briefingWeekend: string | null;
}

export type SettingKey = keyof Settings;

const SETTINGS_KEY = 'settings';

const DEFAULTS: Settings = {
    apiToken: '',
    // TZ setzt das Docker-Image als Vorgabe; festgelegt (gesperrt) wird sie nur mit STELLAR_TIMEZONE
    timeZone: process.env.TZ || 'Europe/Berlin',
    publicUrl: '',
    haUrl: '',
    haToken: '',
    haNotifyService: '',
    haBriefingEntities: [],
    briefingWeekday: '07:00',
    briefingWeekend: '09:00',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/* ---------------- Normalisieren ---------------- */

const trimUrl = (value: string) => value.trim().replace(/\/+$/, '');
const normalizeService = (value: string) => value.trim().replace(/^notify\./, '');
const normalizeTime = (value: string | null | undefined): string | null => {
    const trimmed = (value ?? '').trim();
    return TIME_PATTERN.test(trimmed) ? trimmed : null;
};
const splitList = (value: string) => value.split(',').map(entry => entry.trim()).filter(Boolean);

/* ---------------- Umgebungsvariablen (haben Vorrang) ---------------- */

function readEnvironment(): Partial<Settings> {
    const env = process.env;
    const result: Partial<Settings> = {};
    const token = (env.STELLAR_API_TOKEN ?? '').trim();
    if (token.length >= MIN_API_TOKEN_LENGTH) result.apiToken = token;
    if (env.STELLAR_TIMEZONE) result.timeZone = env.STELLAR_TIMEZONE.trim();
    if (env.STELLAR_PUBLIC_URL) result.publicUrl = trimUrl(env.STELLAR_PUBLIC_URL);
    if (env.HA_URL) result.haUrl = trimUrl(env.HA_URL);
    if (env.HA_TOKEN) result.haToken = env.HA_TOKEN.trim();
    if (env.HA_NOTIFY_SERVICE) result.haNotifyService = normalizeService(env.HA_NOTIFY_SERVICE);
    if (env.HA_BRIEFING_ENTITIES) result.haBriefingEntities = splitList(env.HA_BRIEFING_ENTITIES);
    // Leerer Wert oder „off“ schaltet das Briefing ab
    if (env.BRIEFING_TIME_WEEKDAY !== undefined) result.briefingWeekday = normalizeTime(env.BRIEFING_TIME_WEEKDAY);
    if (env.BRIEFING_TIME_WEEKEND !== undefined) result.briefingWeekend = normalizeTime(env.BRIEFING_TIME_WEEKEND);
    return result;
}

const fromEnvironment = readEnvironment();

/** Felder, die per Umgebungsvariable festgelegt sind (in der Oberfläche gesperrt) */
export const lockedSettings = Object.keys(fromEnvironment) as SettingKey[];

/* ---------------- Laden, Lesen, Speichern ---------------- */

let stored: Partial<Settings> = {};
let current: Settings = { ...DEFAULTS, ...fromEnvironment };

function applyTimeZone(timeZone: string): void {
    // Node übernimmt eine geänderte Zeitzone sofort für alle Datumsberechnungen
    if (process.env.TZ !== timeZone) process.env.TZ = timeZone;
}

function recompute(): void {
    current = { ...DEFAULTS, ...stored, ...fromEnvironment };
    applyTimeZone(current.timeZone);
}

async function persist(): Promise<void> {
    await queryRows(
        `INSERT INTO app_state (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [SETTINGS_KEY, JSON.stringify(stored)],
    );
}

export const generateApiToken = () => randomBytes(32).toString('base64url');

/** Beim Start: gespeicherte Einstellungen laden, beim ersten Mal ein API-Token erzeugen */
export async function loadSettings(): Promise<void> {
    const row = await queryOne<{ value: string }>('SELECT value FROM app_state WHERE key = $1', [SETTINGS_KEY]);
    stored = row ? (JSON.parse(row.value) as Partial<Settings>) : {};
    if (!stored.apiToken && !fromEnvironment.apiToken) {
        stored.apiToken = generateApiToken();
        await persist();
    }
    recompute();
}

export function getSettings(): Readonly<Settings> {
    return current;
}

export function isPushConfigured(): boolean {
    return Boolean(current.haUrl && current.haToken && current.haNotifyService);
}

export interface SettingsPatch {
    timeZone?: string;
    publicUrl?: string;
    haUrl?: string;
    /** Leer lassen = unverändert; '-' = löschen */
    haToken?: string;
    haNotifyService?: string;
    haBriefingEntities?: string;
    briefingWeekday?: string | null;
    briefingWeekend?: string | null;
}

export async function updateSettings(patch: SettingsPatch): Promise<void> {
    if (patch.timeZone !== undefined) stored.timeZone = patch.timeZone.trim() || DEFAULTS.timeZone;
    if (patch.publicUrl !== undefined) stored.publicUrl = trimUrl(patch.publicUrl);
    if (patch.haUrl !== undefined) stored.haUrl = trimUrl(patch.haUrl);
    if (patch.haToken !== undefined && patch.haToken.trim() !== '') {
        stored.haToken = patch.haToken.trim() === '-' ? '' : patch.haToken.trim();
    }
    if (patch.haNotifyService !== undefined) stored.haNotifyService = normalizeService(patch.haNotifyService);
    if (patch.haBriefingEntities !== undefined) stored.haBriefingEntities = splitList(patch.haBriefingEntities);
    if (patch.briefingWeekday !== undefined) stored.briefingWeekday = normalizeTime(patch.briefingWeekday);
    if (patch.briefingWeekend !== undefined) stored.briefingWeekend = normalizeTime(patch.briefingWeekend);
    await persist();
    recompute();
}

export async function regenerateApiToken(): Promise<string> {
    stored.apiToken = generateApiToken();
    await persist();
    recompute();
    return current.apiToken;
}
