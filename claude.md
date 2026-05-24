## 🎯 Projekt-Mission

Ich habe **InstaGPX** ([github.com/alterebro/instagpx](https://github.com/alterebro/instagpx), GPL v3, von Jorge Moreno) geforkt und möchte daraus eine moderne, selbst gehostete Web-App machen, mit der ich aus meinen Komoot-GPX-Dateien hochwertige Übersichtsgrafiken im Stil von **adidas Running** erstelle (Foto als Hintergrund + Aktivitätsname + Routen-Umriss + Stats).

**Wichtig (GPL v3):**
- Behalte die Copyright-Hinweise von `@alterebro` im Code
- Erwähne im README, dass das Projekt auf InstaGPX basiert
- Lege `LICENSE` als GPL v3 mit ab
- Code bleibt unter GPL v3

Der Original-Code (Vue 2 + Parcel) liegt im Repo. **Verwende ihn als Referenz** für die GPX-Parsing-Logik, die Stats-Berechnung und das Map-Rendering — schreibe aber alles im neuen Stack komplett neu.

---

## 🏗️ Tech-Stack

### Frontend
- **Vue 3** (Composition API, `<script setup>`)
- **Vite** als Build-Tool
- **TypeScript** (strict mode)
- **Pinia** für State Management
- **Vue Router** für Routing
- **TailwindCSS** für Styling
- **VueUse** für Composables (Drag, Keyboard-Shortcuts, etc.)

### Map & GPX
- **Leaflet** oder **MapLibre GL** für Map-Rendering (Empfehlung: MapLibre GL für vektorbasierte Outlines)
- **gpxparser** oder eigener GPX-Parser (XML-basiert)
- **Canvas / SVG** für die finale Bildkomposition (Export via `html2canvas` oder direkt Canvas-API — bitte abwägen)

### Backend
- **Node.js** + **Express** (oder Fastify)
- **better-sqlite3** als DB (synchron, einfach, perfekt für Single-User)
- **bcrypt** für Passwort-Hashing
- **express-session** + **connect-sqlite3** für Sessions
- **multer** für Foto-Uploads (Logo / Wasserzeichen)

### Deployment
- **Docker** + **docker-compose.yml**
- Multi-stage Build (Frontend wird gebaut, dann von Express ausgeliefert)
- Volume für SQLite-DB und Logo-Uploads (Persistenz)
- Erreichbar via IP (keine HTTPS-Anforderung — läuft hinter eigenem Reverse Proxy)

### Sonstiges
- **Komplette UI auf Deutsch** (auch Fehler-Meldungen, Tooltips)
- **Single-User** mit einem festen Passwort (in DB gehasht)
- **Dark UI** für die Editor-Oberfläche

---

## 📁 Vorgeschlagene Projekt-Struktur

```
gravelcard/
├── frontend/                  # Vue 3 + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/        # Canvas, Drag&Drop, Element-Komponenten
│   │   │   ├── settings/      # Settings-Seite
│   │   │   └── shared/        # Buttons, Inputs, etc.
│   │   ├── stores/            # Pinia-Stores (auth, settings, editor, gpx)
│   │   ├── composables/       # useGpx, useDrag, useUndoRedo, ...
│   │   ├── views/             # LoginView, EditorView, SettingsView
│   │   ├── utils/             # gpxParser.ts, mapRenderer.ts, exporter.ts
│   │   ├── types/             # TypeScript-Interfaces
│   │   └── App.vue
│   └── vite.config.ts
├── backend/                   # Node.js + Express
│   ├── src/
│   │   ├── routes/            # auth.ts, settings.ts, upload.ts
│   │   ├── db/                # schema.sql, migrations
│   │   ├── middleware/        # authMiddleware
│   │   └── server.ts
│   └── tsconfig.json
├── docker-compose.yml
├── Dockerfile
├── LICENSE                    # GPL v3
├── README.md
└── CLAUDE.md                  # Dieses Dokument
```

---

## 🎨 UI/UX-Spezifikation

### Layout: Editor-Seite (Hauptansicht)

```
┌─────────────────────────────────────────────────────┐
│ [☰] GravelCard       [💾 Export] [📤 Share] [⚙️]    │  ← Top Bar
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  [Canvas /       │  Editor-Panel (rechts):         │
│   Live-Preview]  │  - GPX hochladen (Drag&Drop)    │
│                  │  - Foto hochladen + Crop        │
│                  │  - Aktivität wählen             │
│                  │  - Stats anzeigen/anpassen       │
│   1:1 / 9:16 /   │  - Element-Liste mit:           │
│   4:5            │    👁 Sichtbarkeit              │
│                  │    🔒 Sperren                    │
│                  │  - Format-Auswahl                │
│                  │  - Raster on/off                 │
│                  │  - [↶ Undo] [↷ Redo]            │
│                  │  - [Reset to Defaults]          │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

### Bildkomposition (Default = adidas-Running-Stil)

Standard-Elemente (Position und Stil in Settings änderbar):
1. **Foto** als vollflächiger Hintergrund
2. **Aktivitätstitel** unten links (groß, fett, weiß) — z.B. `WANDERN`
3. **Stats** unten in 3 Spalten:
   - Spalte 1: Distanz (z.B. `10,99 km` / `Distanz`)
   - Spalte 2: Dauer (z.B. `03:03:17` / `Dauer`)
   - Spalte 3: HM aufwärts (z.B. `378 m` / `HM aufwärts`)
4. **Route-Outline** rechts unten (nur Umriss, weiß, ~25% der Bildbreite)
5. **Optionales Logo** oben rechts (vom User hochgeladen, ersetzt das adidas-Logo)
6. **Optionales Höhenprofil** als zusätzliches Element
7. **Gradient-Overlay** unten (für Text-Lesbarkeit)

### Aktivitäts-Dropdown
- Optionen: `Gravel`, `Wandern`, `Spazieren gehen`, `Laufen`, `Sonstiges`
- Bei `Sonstiges` → Texteingabefeld erscheint für eigenen Wert
- Anzeige im Bild: UPPERCASE

### Export-Formate
- 1:1 Quadrat → 1280×1280 (Default)
- 9:16 Story → 1080×1920
- 4:5 Instagram-Post → 1080×1350
- Beim Format-Wechsel: Elemente proportional umpositionieren (oder neu layouten lassen — gut durchdenken)

---

## 🔧 Feature-Liste (komplett)

### Editor-Features
- [ ] **Foto-Upload mit Crop & Zoom** — vor dem Anwenden Ausschnitt auswählen (z.B. mit `vue-advanced-cropper`)
- [ ] **GPX Drag & Drop** direkt ins Editor-Fenster
- [ ] **GPX-Parser** liest: Trackpoints, Distanz, Dauer, Höhenmeter ↑/↓, Pace, Ø-/Max-Speed, Max-Höhe, etc.
- [ ] **Alle GPX-Werte anzeigen** — User wählt in Settings, welche standardmäßig im Bild gezeigt werden
- [ ] **Manuelle Overrides** — Werte (Distanz, Dauer, HM) im Editor händisch überschreibbar
- [ ] **Drag & Drop** für alle Elemente (freie Position)
- [ ] **Raster (optional aktivierbar)** — Snap auf 8px-Grid, im UI sichtbar als feines Gitter
- [ ] **Pfeiltasten-Nudge** — markiertes Element: Pfeil = 1px, Shift+Pfeil = 10px
- [ ] **Element-Sichtbarkeit** togglen (👁-Icon in Element-Liste)
- [ ] **Element-Sperren** (🔒-Icon → Element kann nicht verschoben werden, bleibt aber sichtbar)
- [ ] **Undo/Redo** (Ctrl+Z / Ctrl+Shift+Z) mit History-Stack in Pinia
- [ ] **Live-Preview** — Änderungen werden sofort im Canvas reflektiert
- [ ] **Reset to Defaults** — Layout auf gespeicherte Standard-Positionen zurücksetzen

### Visual-Features
- [ ] **Route-Outline** — nur Umriss der Strecke (weiß Default, Farbe + Strichstärke in Settings)
- [ ] **Speed-Heatmap** auf Route — alternativ zur einfarbigen Outline ein Farbgradient nach:
  - Geschwindigkeit (langsam → schnell)
  - Höhe (tief → hoch)
  - Toggle in Settings
- [ ] **Höhenprofil-Element** — optional einblendbar, als kleines SVG-Linien-Diagramm
- [ ] **Gradient-Overlay** — dunkler Verlauf unten (Stärke konfigurierbar) für Text-Lesbarkeit
- [ ] **Auto-Kontrast für Text** — analysiere durchschnittliche Helligkeit unter dem Text-Bereich, wähle automatisch weiß/schwarz, manuell überschreibbar
- [ ] **Bild-Filter** — Slider für Helligkeit, Kontrast, Sättigung (per CSS-Filter live, beim Export per Canvas)
- [ ] **Font-Auswahl** — kuratierte Liste z.B. Inter, Bebas Neue, Oswald, Playfair Display, Montserrat (lokal eingebunden, keine Google-Fonts-Calls)
- [ ] **Logo/Wasserzeichen-Upload** — User lädt eigenes PNG hoch (z.B. SVG/PNG mit Transparenz), wird als Element platzierbar

### Settings-Seite
- [ ] **Standard-Aktivität** — welche Option ist im Dropdown vorausgewählt
- [ ] **Standard-Stats** — Multi-Select aus allen verfügbaren GPX-Werten (Default: Distanz, Dauer, HM ↑)
- [ ] **Standard-Format** — 1:1 / 9:16 / 4:5
- [ ] **Outline-Farbe & Strichstärke**
- [ ] **Heatmap-Modus** (off / speed / elevation)
- [ ] **Font-Family**
- [ ] **Gradient-Overlay-Stärke**
- [ ] **Logo-Upload & Position**
- [ ] **Standard-Element-Positionen** — Editor-Layout als Standard speichern (per "Aktuelles Layout als Standard speichern"-Button)
- [ ] **Reset auf Werks-Defaults**
- [ ] **Passwort ändern**

### Auth & Sicherheit
- [ ] **Login-Seite** mit Passwortabfrage
- [ ] **Initial-Setup** — beim ersten Start fragt die App nach einem Passwort und legt es gehasht in der DB ab
- [ ] **Session-Cookie** (HttpOnly, SameSite=Lax)
- [ ] **Auth-Middleware** schützt alle Backend-Routes außer `/api/auth/*`
- [ ] **Logout-Button**

### Export & Share
- [ ] **Export als PNG** in nativer Auflösung des gewählten Formats
- [ ] **Direkter Share** via Web Share API (`navigator.share`) mit Fallback auf "Bild kopieren" / "Download"

### Sonstiges
- [ ] **Dark UI** für gesamte Editor- und Settings-Oberfläche
- [ ] **Deutsche UI** — alle Texte, Tooltips, Fehlermeldungen
- [ ] **Responsive Editor** — funktioniert auch auf Tablet (Desktop ist Hauptziel)

---

## 🚫 Explizit NICHT enthalten

- ❌ Komoot-API-Integration (manuell GPX hochladen reicht)
- ❌ Tour-Historie / gespeicherte Touren
- ❌ Mehrere Vorlagen — nur **ein** Default-Layout via Settings
- ❌ Multi-Foto pro Tour
- ❌ Multi-User (Single-User only)
- ❌ EXIF-Auslese vom Foto
- ❌ Cloud-Sync

---

## 📋 Implementierungs-Reihenfolge (empfohlene Phasen)

Bitte gehe die Phasen der Reihe nach durch. Frag mich nicht, ob wir weiter machen sollen, du arbeitest vor dich hin. Wenn du auf Probleme stößt, dann schreib sie in eine problems.md und wir gehen diese durch, wenn du fertig bist. ich lass dich alleine und kann nicht auf deine fragen eingehen, daher mach alles und merke dir die probleme. nutze agenten um sachen parallel abzuarbeiten, soweit sinnvoll. der code liegt in diesem verzeichnis.

### Phase 1: Setup & Architektur
- Projekt-Struktur anlegen
- `docker-compose.yml` + `Dockerfile` (Multi-Stage)
- Frontend-Skelett: Vue 3 + Vite + TS + Pinia + Router + Tailwind
- Backend-Skelett: Express + better-sqlite3 + Session
- README aktualisieren (mit Hinweis auf InstaGPX-Ursprung)
- LICENSE (GPL v3) übernehmen

### Phase 2: Auth & DB
- DB-Schema: `users` (id, password_hash), `settings` (key, value als JSON)
- Initial-Setup-Flow: Wenn keine User in DB → "Passwort anlegen"-Seite
- Login-Seite, Session-Handling
- Auth-Middleware

### Phase 3: GPX-Parsing & Datenmodell
- GPX-Parser (TypeScript), liest alle relevanten Stats
- Pinia-Store für aktuelle Tour-Daten
- Drag & Drop für GPX-Datei

### Phase 4: Editor-Canvas
- Canvas-Komponente mit Live-Preview
- Element-System (Pinia-Store für Elemente: Position, Größe, Sichtbarkeit, Sperrung)
- Drag-Logic für Elemente
- Default-Elemente: Foto, Titel, Stats, Route-Outline

### Phase 5: Map-Rendering & Route-Outline
- Route aus GPX-Punkten als SVG/Canvas-Outline rendern
- Speed-Heatmap-Modus
- Höhenprofil-Element

### Phase 6: Editor-UX
- Element-Liste mit Sichtbarkeit/Sperren
- Pfeiltasten-Nudge
- Raster (optional aktivierbar mit Snap)
- Undo/Redo
- Reset to Defaults

### Phase 7: Bildbearbeitung
- Foto-Crop & Zoom beim Upload
- Bild-Filter (Helligkeit, Kontrast, Sättigung)
- Gradient-Overlay
- Auto-Kontrast für Text

### Phase 8: Settings-Seite
- Komplette Settings-Persistierung in DB
- Logo-Upload
- "Aktuelles Layout als Standard speichern"

### Phase 9: Export & Share
- PNG-Export in voller Auflösung
- Web Share API mit Fallback

### Phase 10: Polish & Docker-Test
- Deutsche Texte überall prüfen
- Docker-Compose finalisieren
- README mit Setup-Anleitung
- Smoke-Test

---

## 🎯 Qualitäts-Erwartungen

- **TypeScript strict** — keine `any` ohne sehr gute Begründung
- **Composables** für wiederverwendbare Logik (`useGpx`, `useUndoRedo`, `useDrag`)
- **Pinia-Stores** klar abgegrenzt (auth, settings, editor, gpx)
- **Kommentare auf Deutsch oder Englisch** — konsistent halten
- **Keine externen Tracker, keine Google-Fonts-Calls**, alles selbst gehostet
- **Funktional getestet**: Nach jeder Phase manuell prüfen, dass nichts kaputt ist

---

## ❓ Bei Unklarheiten

Frag mich, bevor du Annahmen triffst — besonders bei UI-Details, Default-Werten oder Library-Wahl, wenn mehrere sinnvolle Optionen existieren.

**Starte mit Phase 1 und zeig mir am Ende, was du angelegt hast, bevor du Phase 2 angehst.**