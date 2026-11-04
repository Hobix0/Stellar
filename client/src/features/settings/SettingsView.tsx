/* ==================================================================
   Stellar · Einstellungen: Jarvis & Anbindungen
   - API-Token und fertige Adressen für Home Assistant / Claude (MCP)
   - Home Assistant für Push-Nachrichten und Briefing-Werte
   - Uhrzeiten des Morgen-Briefings, Zeitzone
   ================================================================== */

import { useEffect, useState } from 'react';
import type { SettingsInput, SettingsView as Settings } from '../../../../shared/types';
import { remindersApi } from '../../api/remindersApi';
import { settingsApi } from '../../api/settingsApi';
import { Icon } from '../../components/ui/Icon';

interface FormState {
    publicUrl: string;
    timeZone: string;
    haUrl: string;
    haToken: string;
    haNotifyService: string;
    haBriefingEntities: string;
    briefingWeekday: string;
    briefingWeekend: string;
}

function toForm(settings: Settings): FormState {
    return {
        publicUrl: settings.publicUrl,
        timeZone: settings.timeZone,
        haUrl: settings.haUrl,
        haToken: '',
        haNotifyService: settings.haNotifyService,
        haBriefingEntities: settings.haBriefingEntities,
        briefingWeekday: settings.briefingWeekday ?? '',
        briefingWeekend: settings.briefingWeekend ?? '',
    };
}

/** Kopierbare Zeile mit Knopf */
function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="form-row">
            <span className="form-label">{label}</span>
            <div className="copy-field">
                <code className="copy-field-value">{value}</code>
                <button type="button" className="button button-small" onClick={() => void copy()}>
                    {copied ? 'Kopiert ✓' : 'Kopieren'}
                </button>
            </div>
            {hint && <span className="form-hint">{hint}</span>}
        </div>
    );
}

export function SettingsView() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState<FormState | null>(null);
    const [notice, setNotice] = useState<{ kind: 'success' | 'warning'; text: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        document.title = 'Einstellungen · Stellar';
        settingsApi
            .get()
            .then(loaded => {
                setSettings(loaded);
                setForm(toForm(loaded));
            })
            .catch(console.error);
    }, []);

    if (!settings || !form) return <p className="empty-state">Lädt …</p>;

    const isLocked = (key: string) => settings.locked.includes(key);
    const origin = settings.publicUrl || window.location.origin;
    const field = (key: keyof FormState) => ({
        value: form[key],
        disabled: isLocked(key),
        onChange: (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value }),
    });

    const save = async () => {
        setIsSaving(true);
        setNotice(null);
        try {
            const changes: SettingsInput = {};
            for (const key of Object.keys(form) as (keyof FormState)[]) {
                if (isLocked(key)) continue;
                if (key === 'haToken') {
                    if (form.haToken.trim()) changes.haToken = form.haToken.trim();
                } else {
                    (changes as Record<string, string>)[key] = form[key];
                }
            }
            const saved = await settingsApi.update(changes);
            setSettings(saved);
            setForm(toForm(saved));
            setNotice({ kind: 'success', text: 'Gespeichert.' });
        } catch (error) {
            setNotice({ kind: 'warning', text: (error as Error).message });
        } finally {
            setIsSaving(false);
        }
    };

    const testPush = async () => {
        setNotice(null);
        try {
            await remindersApi.sendTestPush();
            setNotice({ kind: 'success', text: 'Test-Push gesendet – schau aufs Handy.' });
        } catch (error) {
            setNotice({ kind: 'warning', text: (error as Error).message });
        }
    };

    const regenerate = async () => {
        if (!confirm('Neues Token erzeugen? Home Assistant und Claude brauchen danach die neuen Adressen.')) return;
        const updated = await settingsApi.regenerateToken();
        setSettings(updated);
        setNotice({ kind: 'success', text: 'Neues Token erzeugt.' });
    };

    return (
        <section className="content-narrow settings">
            <header className="view-header">
                <div>
                    <h1 className="view-title">Einstellungen</h1>
                    <p className="view-subtitle">Jarvis, Home Assistant und das Morgen-Briefing.</p>
                </div>
            </header>

            {notice && (
                <div className={`banner banner-${notice.kind}`}>
                    <span>{notice.text}</span>
                    <button className="button button-small button-ghost" onClick={() => setNotice(null)}>
                        OK
                    </button>
                </div>
            )}

            <article className="card settings-card">
                <h2 className="card-title">Jarvis & Anbindungen</h2>
                <p className="muted settings-text">
                    Über diese Adressen greifen Home Assistant und Claude auf Stellar zu. Wer das Token kennt, kann lesen und schreiben –
                    behandle es wie ein Passwort.
                </p>
                <CopyField
                    label="Home Assistant · MCP-Server (SSE)"
                    value={`${origin}/connect/t/${settings.apiToken}/mcp/sse`}
                    hint="In Home Assistant unter Integrationen → „Model Context Protocol“ eintragen."
                />
                <CopyField
                    label="Claude Desktop · MCP (Streamable HTTP)"
                    value={`${origin}/connect/t/${settings.apiToken}/mcp`}
                    hint="Für mcp-remote in der Claude-Desktop-Konfiguration."
                />
                <CopyField label="API-Token (für Node-RED, Header „Authorization: Bearer …“)" value={settings.apiToken} />
                {!isLocked('apiToken') && (
                    <div className="form-actions">
                        <button type="button" className="button button-small button-danger" onClick={() => void regenerate()}>
                            Neues Token erzeugen
                        </button>
                    </div>
                )}
            </article>

            <form
                className="card settings-card form"
                onSubmit={event => {
                    event.preventDefault();
                    void save();
                }}
            >
                <h2 className="card-title">Home Assistant · Push aufs Handy</h2>
                <label className="form-row">
                    <span className="form-label">Adresse von Home Assistant im Heimnetz</span>
                    <input className="input" placeholder="http://10.100.8.2:8123" {...field('haUrl')} />
                </label>
                <label className="form-row">
                    <span className="form-label">
                        Langlebiges Zugriffstoken {settings.haTokenSet ? '· gesetzt ✓ (leer lassen = behalten, „-“ = löschen)' : '· noch nicht gesetzt'}
                    </span>
                    <input className="input" type="password" autoComplete="off" placeholder="Profil → Sicherheit → Token erstellen" {...field('haToken')} />
                </label>
                <label className="form-row">
                    <span className="form-label">notify-Dienst deines Handys</span>
                    <input className="input" placeholder="mobile_app_iphone_von_luca" {...field('haNotifyService')} />
                </label>
                <label className="form-row">
                    <span className="form-label">Werte fürs Briefing (Entitäten, kommagetrennt)</span>
                    <input className="input" placeholder="weather.forecast_home, sensor.temperatur_zuhause" {...field('haBriefingEntities')} />
                </label>

                <h2 className="card-title settings-subtitle">Morgen-Briefing & Allgemein</h2>
                <div className="form-grid">
                    <label className="form-row">
                        <span className="form-label">Werktags um (leer = aus)</span>
                        <input className="input" type="time" {...field('briefingWeekday')} />
                    </label>
                    <label className="form-row">
                        <span className="form-label">Wochenende um (leer = aus)</span>
                        <input className="input" type="time" {...field('briefingWeekend')} />
                    </label>
                    <label className="form-row">
                        <span className="form-label">Zeitzone</span>
                        <input className="input" placeholder="Europe/Berlin" {...field('timeZone')} />
                    </label>
                </div>
                <label className="form-row">
                    <span className="form-label">Adresse von Stellar (für Links in Push-Nachrichten)</span>
                    <input className="input" placeholder="http://umbrel.local:3742" {...field('publicUrl')} />
                </label>
                {settings.locked.length > 0 && (
                    <p className="form-hint">Grau = per Umgebungsvariable festgelegt ({settings.locked.join(', ')}).</p>
                )}
                <div className="form-actions">
                    <button type="button" className="button" onClick={() => void testPush()}>
                        <Icon name="bell" size={16} /> Test-Push
                    </button>
                    <button type="submit" className="button button-primary" disabled={isSaving}>
                        Speichern
                    </button>
                </div>
            </form>
        </section>
    );
}
