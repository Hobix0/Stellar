/* ==================================================================
   Stellar · Home Assistant über dessen REST-API
   - Push-Nachrichten über einen notify-Dienst (z. B. die iPhone-App)
   - Zustände einzelner Entitäten für das Briefing
   Adresse, Zugriffstoken und notify-Dienst kommen aus den Einstellungen.
   ================================================================== */

import type { BriefingHomeValue } from '../../../shared/types';
import { getSettings, isPushConfigured } from '../settings/settings.service';

const REQUEST_TIMEOUT_MS = 10_000;

export interface PushMessage {
    title: string;
    message: string;
    /** Pfad in Stellar, den das iPhone beim Antippen öffnet, z. B. '/reminders' */
    path?: string;
    /** Push-Gruppe auf dem iPhone (Benachrichtigungen werden zusammengefasst) */
    group?: string;
}

async function callHomeAssistant(method: 'GET' | 'POST', apiPath: string, body?: unknown): Promise<unknown> {
    const settings = getSettings();
    const response = await fetch(`${settings.haUrl}/api/${apiPath}`, {
        method,
        headers: {
            Authorization: `Bearer ${settings.haToken}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`Home Assistant antwortet mit ${response.status} auf ${method} /api/${apiPath}`);
    }
    return response.json().catch(() => null);
}

/** Schickt eine Push-Nachricht. Wirft, wenn Home Assistant nicht erreichbar ist. */
export async function sendPush(push: PushMessage): Promise<void> {
    if (!isPushConfigured()) throw new Error('Push ist nicht eingerichtet (Home-Assistant-Adresse, Token, notify-Dienst)');
    const settings = getSettings();
    const data: Record<string, unknown> = { group: push.group ?? 'stellar' };
    // „url“ öffnet beim Antippen einen Link (iOS); „clickAction“ dasselbe für Android
    if (settings.publicUrl && push.path) {
        data.url = `${settings.publicUrl}${push.path}`;
        data.clickAction = data.url;
    }
    await callHomeAssistant('POST', `services/notify/${encodeURIComponent(settings.haNotifyService)}`, {
        title: push.title,
        message: push.message,
        data,
    });
}

/** Wetterzustände von Home Assistant auf Deutsch */
const WEATHER_WORDS: Record<string, string> = {
    'clear-night': 'klare Nacht',
    cloudy: 'bewölkt',
    exceptional: 'Unwetter',
    fog: 'Nebel',
    hail: 'Hagel',
    lightning: 'Gewitter',
    'lightning-rainy': 'Gewitter mit Regen',
    partlycloudy: 'teils bewölkt',
    pouring: 'Starkregen',
    rainy: 'Regen',
    snowy: 'Schnee',
    'snowy-rainy': 'Schneeregen',
    sunny: 'sonnig',
    windy: 'windig',
    'windy-variant': 'windig und bewölkt',
};

interface HomeAssistantState {
    entity_id: string;
    state: string;
    attributes: { friendly_name?: string; unit_of_measurement?: string; temperature?: number; temperature_unit?: string };
}

function describeState(entity: HomeAssistantState): string {
    const { state, attributes } = entity;
    if (entity.entity_id.startsWith('weather.')) {
        const word = WEATHER_WORDS[state] ?? state;
        if (attributes.temperature === undefined) return word;
        const temperature = Number(attributes.temperature).toLocaleString('de-DE', { maximumFractionDigits: 1 });
        return `${word}, ${temperature} ${attributes.temperature_unit ?? '°C'}`;
    }
    const numeric = Number(state);
    const value = Number.isFinite(numeric) && state.trim() !== '' ? numeric.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : state;
    return attributes.unit_of_measurement ? `${value} ${attributes.unit_of_measurement}` : value;
}

/**
 * Liest die für das Briefing eingestellten Zustände.
 * Fehlende oder nicht verfügbare Entitäten werden still übersprungen – das Briefing soll trotzdem kommen.
 */
export async function readBriefingValues(): Promise<BriefingHomeValue[]> {
    const settings = getSettings();
    if (!settings.haUrl || !settings.haToken) return [];
    const results = await Promise.allSettled(
        settings.haBriefingEntities.map(
            async entityId => (await callHomeAssistant('GET', `states/${encodeURIComponent(entityId)}`)) as HomeAssistantState,
        ),
    );
    const values: BriefingHomeValue[] = [];
    for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const entity = result.value;
        if (['unavailable', 'unknown'].includes(entity.state)) continue;
        values.push({
            entityId: entity.entity_id,
            name: entity.attributes.friendly_name ?? entity.entity_id,
            value: describeState(entity),
        });
    }
    return values;
}
