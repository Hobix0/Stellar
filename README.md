# Stellar

**Selbst gehostetes Second Brain im Notion-Stil** – Wiki, Tagesnotizen, Inbox und Projekte auf dem eigenen Server
(z. B. umbrelOS). Basiert auf [Orbit](https://github.com/Hobix0/Orbit), neu aufgebaut in
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
  hooks/, lib/             Verzögertes Speichern, Datum, HTML, Theme
  styles/                  Notion-Stil, hell/dunkel (Variablen in tokens.css)

hobix-stellar/             Umbrel-App (Manifest + docker-compose)
umbrel-app-store.yml       Macht dieses Repo zum Umbrel Community App Store
```

**Datenbank-Änderungen:** neue Datei `server/src/db/migrations/00X-name.ts` anlegen und in
`migrations/index.ts` eintragen. Veröffentlichte Migrationen nie nachträglich ändern.
