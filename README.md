# Stellar

**Selbst gehostetes Second Brain im Notion-Stil** – Wiki, Tagesnotizen, Inbox, Projekte und Erinnerungen auf dem
eigenen Server (z. B. umbrelOS), mit Push über Home Assistant und einem MCP-Server für Sprachassistenten und Claude. Basiert auf [Orbit](https://github.com/Hobix0/Orbit), neu aufgebaut in
TypeScript mit PostgreSQL.

---

## Funktionen

**Wiki**
- Verschachtelte Seiten mit Icon, Seitenbaum (Drag & Drop zum Verschieben), Favoriten
- Block-Editor: Slash-Menü (`/`), Markdown-Kürzel (`#`, `##`, `###`, `-`, `1.`, `[]`, `>`, ` ``` `, `---`),
  Blöcke per Griff verschieben, umwandeln, duplizieren, löschen
- Blocktypen: Text, Überschriften, Aufzählung, nummerierte Liste, Aufgabe, Zitat, Hinweis, Code, Trennlinie, Unterseite
- Seiten verlinken mit `[[` – inklusive „neue Seite anlegen“; **Rückverweise** („Verlinkt von …“)
- Volltextsuche (`Strg`/`Cmd` + `K`), zuletzt besuchte Seiten, Papierkorb (30 Tage)

**Tagesnotizen**
- „Heute“ öffnet die Notiz des Tages (wird beim ersten Öffnen angelegt)
- Vor/zurück, Kalender mit Markierung beschriebener Tage, an dem Tag fällige Aufgaben über der Notiz
- Leere Tagesnotizen vergangener Tage werden automatisch aufgeräumt; im Seitenbaum erscheinen sie nicht

**Inbox**
- Gedanken sofort festhalten: `Alt` + `N` von überall, Feld auf Start- und Inbox-Seite
- Einsortieren per Klick: **→ Heute** (an die Tagesnotiz anhängen), **→ Seite**, **→ Aufgabe** (erste Zeile = Titel)
- Auf dem Handy als App installierbar („Zum Home-Bildschirm“) mit Verknüpfungen „Schnell notieren“ und „Heute“

**Projekte**
- Projekte mit Icon, Farbe, Status, Zeitraum und verknüpfter Wiki-Seite
- Board (Kanban, Drag & Drop) und Liste, Filter nach Text, Label, Priorität
- Aufgaben mit Status, Priorität, Start/Fälligkeit, Labels, Checkliste, Beschreibung, Wiki-Seite
- Startseite mit fälligen Aufgaben der nächsten 7 Tage

**Erinnerungen**
- Einmalig, täglich, werktags, wöchentlich oder monatlich; Zeitumstellung und Monatsende werden richtig behandelt
- Zum Zeitpunkt als Push aufs Handy (über Home Assistant), Ansicht „Erinnerungen“ und Block auf der Startseite
- Abhaken: einmalige sind erledigt, wiederkehrende springen auf den nächsten Termin

**Morgen-Briefing**
- Werktags und am Wochenende zu einstellbarer Uhrzeit als Push: fällige und überfällige Aufgaben, Erinnerungen
  des Tages, Inbox-Stand und frei wählbare Werte aus Home Assistant (Wetter, Auto-Akku …)

**Jarvis-Anbindung**
- Connect-API unter `/connect/*` mit API-Token – für Home Assistant, Node-RED, Skripte
- MCP-Server mit 14 Werkzeugen (notieren, suchen, Seiten lesen, Aufgaben und Erinnerungen anlegen, Briefing …)
  für Home Assistants Sprachassistenten und Claude; Transporte Streamable HTTP und SSE
- Einstellungen (Zahnrad unten in der Seitenleiste): Token, fertige Adressen zum Kopieren, Home Assistant, Briefing

**Bewusst weggelassen (gegenüber Orbit):** Anmeldung/Benutzer, Räume, Chat, Mail, Kalender,
Anrufe, die gesamte EightBit-Umgebung. Auf Umbrel schützt die Umbrel-Anmeldung den Zugang.

---

## Installation auf umbrelOS (über Git)

1. Repository auf GitHub pushen. Die GitHub-Action [docker.yml](.github/workflows/docker.yml) baut
   das Image `ghcr.io/hobix0/stellar` für amd64 und arm64.
2. **Einmalig:** auf GitHub unter *Packages → stellar → Package settings* die Sichtbarkeit auf
   **Public** stellen (sonst kann Umbrel das Image nicht laden).
3. Für eine Version einen Tag setzen, der zur Version in
   [hobix-stellar/umbrel-app.yml](hobix-stellar/umbrel-app.yml) und
   [hobix-stellar/docker-compose.yml](hobix-stellar/docker-compose.yml) passt:
   ```bash
   git tag v0.1.0 && git push --tags
   ```
4. In umbrelOS: **App Store → ⋯ (oben rechts) → Community App Stores** →
   `https://github.com/Hobix0/Stellar` hinzufügen → **Stellar** installieren.

Die Daten liegen in PostgreSQL unter `${APP_DATA_DIR}/data/db` und werden von Umbrels Backups erfasst.

**Update:** Version in `umbrel-app.yml` und im Image-Tag der Umbrel-`docker-compose.yml` erhöhen,
committen, neuen Git-Tag pushen. Umbrel zeigt das Update dann im App Store an.

## Jarvis: Home Assistant & Claude anbinden

Alles Nötige steht in Stellar unter **Einstellungen** (Zahnrad unten links). Beim ersten Start erzeugt Stellar ein
API-Token; die Adressen dort sind fertig zum Kopieren.

**Push aufs Handy (Erinnerungen, Briefing)**
1. In Home Assistant: Profil → Sicherheit → *Langlebiges Zugriffstoken* erstellen.
2. In Stellar eintragen: Adresse von Home Assistant im Heimnetz (z. B. `http://10.100.8.2:8123`), das Token und den
   notify-Dienst des Handys (Entwicklerwerkzeuge → Aktionen → `notify.mobile_app_…`, ohne `notify.`).
3. *Test-Push* drücken.

**Sprachassistent (Home Assistant Assist)**
1. Integration *Model Context Protocol* hinzufügen, als SSE-Adresse die Zeile „Home Assistant · MCP-Server“ aus den
   Einstellungen verwenden (`http://umbrel.local:3742/connect/t/<token>/mcp/sse`).
2. Einen Gesprächsagenten mit LLM (z. B. Anthropic) einrichten und dort die Stellar-Werkzeuge zusätzlich zu „Assist“
   freigeben.

**Claude Desktop** (`claude_desktop_config.json`, Rechner im Heimnetz):
```json
{
  "mcpServers": {
    "stellar": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://umbrel.local:3742/connect/t/<token>/mcp", "--allow-http"]
    }
  }
}
```

**Connect-API** (Token als `Authorization: Bearer <token>`, `X-Stellar-Token` oder im Pfad `/connect/t/<token>/…`):

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/connect/briefing?date=` | Tagesübersicht als JSON inkl. fertigem Text |
| POST | `/connect/inbox` `{text}` | In die Inbox notieren |
| POST | `/connect/daily` `{text, date?}` | An die Tagesnotiz anhängen |
| GET | `/connect/projects` | Aktive Projekte |
| GET | `/connect/tasks?scope=today\|upcoming\|project&project=` | Offene Aufgaben |
| POST | `/connect/tasks` `{project, title, dueDate?, priority?}` | Aufgabe anlegen (Projekt per Name oder ID) |
| POST | `/connect/tasks/:id/done` | Aufgabe erledigen |
| GET/POST | `/connect/reminders` `{text, dueAt, recurrence?}` | Erinnerungen lesen/anlegen (`dueAt` Ortszeit `JJJJ-MM-TTTHH:MM`) |
| POST/DELETE | `/connect/reminders/:id[/done]` | Abhaken / löschen |
| GET | `/connect/search?q=`, `/connect/pages/:id` | Suchen, Seite als Text |
| POST | `/connect/mcp` · GET `/connect/mcp/sse` | MCP (Streamable HTTP · SSE) |

Auf Umbrel ist nur `/connect/*` an der Umbrel-Anmeldung vorbei freigegeben (`PROXY_AUTH_WHITELIST`); dort prüft
Stellar selbst das Token. Ohne Umbrel lassen sich alle Einstellungen auch per Umgebungsvariable festlegen
(`STELLAR_API_TOKEN`, `STELLAR_TIMEZONE`, `STELLAR_PUBLIC_URL`, `HA_URL`, `HA_TOKEN`, `HA_NOTIFY_SERVICE`,
`HA_BRIEFING_ENTITIES`, `BRIEFING_TIME_WEEKDAY`, `BRIEFING_TIME_WEEKEND`) – sie haben dann Vorrang.

## Ohne Umbrel (Docker)

```bash
docker compose up -d        # http://<server>:3000
```

Stellar hat keine eigene Anmeldung – nur im Heimnetz oder hinter einem Proxy mit Anmeldung betreiben.

## Lokal entwickeln

Voraussetzung: Node.js 22 und Docker (für PostgreSQL).

```bash
npm install
npm run db:up               # PostgreSQL auf localhost:5432 (docker-compose.dev.yml)
cp .env.example .env
npm run dev                 # Server :3000 + Vite :5173 → http://localhost:5173
```

| Befehl | Zweck |
|---|---|
| `npm run dev` | Server (tsx watch) und Frontend (Vite) mit Neuladen |
| `npm run build` | Frontend und Server bauen |
| `npm start` | Gebauten Server starten (liefert auch das Frontend aus) |
| `npm run typecheck` | TypeScript in Server und Client prüfen |

---

## Aufbau

```
shared/types.ts            Gemeinsame Typen & Konstanten (Blöcke, Seiten, Projekte, Aufgaben)

server/src/
  index.ts                 Start: auf DB warten → Migrationen → HTTP → Papierkorb aufräumen
  app.ts                   Express-App: /api, /healthz, Auslieferung des Frontends
  config.ts                Einstellungen aus Umgebungsvariablen
  db/pool.ts               PostgreSQL-Pool, Abfrage- und Transaktionshelfer
  db/migrate.ts            Führt Migrationen genau einmal aus (Tabelle schema_migrations)
  db/migrations/           Eine Datei je Schemaänderung, eingetragen in index.ts
  http/                    Fehlerbehandlung und Eingabeprüfung (zod)
  wiki/                    Seiten: Routen, Datenzugriff, Suche, Block-Bereinigung
  daily/                   Tagesnotizen (Seite je Datum, Kalender, Aufräumen)
  inbox/                   Inbox: Einträge und Einsortieren (Tagesnotiz, Seite, Aufgabe)
  projects/                Projekte, Aufgaben, Checklisten, Labels
  reminders/               Erinnerungen und Wiederholungen
  integrations/            Home Assistant (Push, Zustände), Briefing, Planer
  settings/                Einstellungen der Anbindungen (Datenbank, Umgebungsvariablen haben Vorrang)
  connect/                 Connect-API mit Token und MCP-Server (gemeinsame Aktionen in operations.ts)

client/src/
  App.tsx, main.tsx        Routen und Einstieg
  api/                     fetch-Aufrufe je Bereich
  components/layout/       Seitenleiste und Grundgerüst
  components/ui/           Icons, Dialog, Popover, Emoji- und Farbauswahl
  features/home/           Startseite
  features/daily/          Tagesnotiz-Leiste, Monatskalender, Route /daily
  features/inbox/          Inbox-Ansicht, Schnell-Notiz (Alt + N), gemeinsamer Zustand
  features/wiki/           Seitenansicht, Seitenbaum, Suche, Papierkorb, Rückverweise
  features/wiki/editor/    Block-Editor (Blöcke, Tastatur, Menüs, Schreibmarke)
  features/projects/       Übersicht, Board, Liste, Aufgaben-Dialog
  features/reminders/      Erinnerungen
  features/settings/       Einstellungen (Jarvis, Home Assistant, Briefing)
  hooks/, lib/             Verzögertes Speichern, Datum, HTML, Theme
  styles/                  Notion-Stil, hell/dunkel (Variablen in tokens.css)

hobix-stellar/             Umbrel-App (Manifest + docker-compose)
umbrel-app-store.yml       Macht dieses Repo zum Umbrel Community App Store
```

**Datenbank-Änderungen:** neue Datei `server/src/db/migrations/00X-name.ts` anlegen und in
`migrations/index.ts` eintragen. Veröffentlichte Migrationen nie nachträglich ändern.
