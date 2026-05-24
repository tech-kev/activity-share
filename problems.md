# Probleme & Entscheidungen während der Implementierung

Dieses Dokument sammelt alle Probleme, offene Fragen und Entscheidungen, die während der autonomen Arbeit getroffen wurden, damit wir sie später gemeinsam durchgehen können.

## Format
- **[ENTSCHEIDUNG]** = Eine Annahme, die ich getroffen habe (bitte überprüfen)
- **[PROBLEM]** = Ein Problem, das mein Eingreifen erfordert
- **[TODO]** = Etwas, das noch erledigt werden muss
- **[DONE]** = Punkt wurde mittlerweile umgesetzt (Historie)

---

## Phase 1: Setup & Architektur

### [ENTSCHEIDUNG] Projektname & Verzeichnis
Das Projekt heißt **Activity Share**. Das Arbeitsverzeichnis bleibt `instagpx/`, da das der vorhandene Repo-Root ist.

### [ENTSCHEIDUNG] Original-Code als Referenz
Der Original-InstaGPX-Code (`src/`, `static/`, alte `package.json`, `.parcelrc`, `.assetWrapper.js`) liegt unter `reference/`. `LICENSE` und `README.md` bleiben im Root (GPL v3-Anforderung).

### [ENTSCHEIDUNG] Map-Library
Keine externe Karten-Library. Wir rendern die Route direkt aus den GPX-Punkten als Canvas-Polyline (Outline-Style). Vorteile: keine externen Tile-Calls, offline-fähig.

### [ENTSCHEIDUNG] PNG-Export
Direkt aufs Canvas, kein html2canvas. Pixelgenau, performant, keine Extra-Library.

### [ENTSCHEIDUNG] Backend in TypeScript
Konsistenter Stack: Frontend + Backend in TypeScript strict.

### [ENTSCHEIDUNG] Port-Belegung
- Frontend Dev-Server: `5173` (Vite default, mit Proxy auf 3000)
- Backend: `3000`
- Docker-Container exponiert: `3000` (Backend serviert auch Frontend)

### [ENTSCHEIDUNG] Cropper-Library
`vue-advanced-cropper`.

### [ENTSCHEIDUNG] Crypto für Sessions
Eigener Session-Store auf Basis von `better-sqlite3` (siehe `backend/src/db/sessionStore.ts`). Vorher: `connect-sqlite3`, das brachte einen Rattenschwanz an veralteten Transitive Deps (`sqlite3`, `node-gyp`, `tar`, …) mit. Session-Secret wird beim ersten Start zufällig erzeugt und in `meta` abgelegt.

---

## Phase 6-10: Editor / Settings / Export / Docker

### [ENTSCHEIDUNG] Logo-Position
Logo-Position wird per Drag&Drop im Editor gesetzt (Element ist frei beweglich + resizable). Eine separate „Position“-Auswahl in den Settings (oben-rechts/oben-links/…) existiert nicht — wäre Erweiterung.

### [ENTSCHEIDUNG] Default-Layout-Positionen
Defaults in `frontend/src/stores/editor.ts` als `DEFAULT_ELEMENTS`. Adidas-Style: Titel unten links, Stats unten in 3 Spalten, Route rechts unten. „Aktuelles Layout als Standard speichern“ in den Settings überschreibt das.

### [ENTSCHEIDUNG] Heatmap-Farben
Palette **blau → gelb → rot** (Speed/Höhe niedrig → hoch). Anpassbar in `frontend/src/utils/routeRenderer.ts`.

### [ENTSCHEIDUNG] Moving Duration Heuristik
„Bewegung"-Dauer zählt nur Segmente mit ≥ 0.5 m/s (≈ 1.8 km/h). Anpassbar in `gpxParser.ts`. Heuristik, je nach Aktivität evtl. zu konservativ/liberal.

### [ENTSCHEIDUNG] Preview-Auflösung
Editor rendert eine **1200px** große Preview (Längsseite) für flüssige Live-Vorschau. Der Export rendert die volle Auflösung (1280 bzw. 1920 px).

### [ENTSCHEIDUNG] PNG-Filename
`activity-share-<titelslug>-<YYYY-MM-DD>.png`. Falls kein Titel → Aktivitäts-Key.

---

## Erweiterungen aus User-Feedback

### [DONE] Projekt umbenannt
`gravelcard` → `activity-share` (npm-Paketnamen, Docker-Container-Namen, Session-Cookie, DB-Datei). UI-Anzeige: „Activity Share".

### [DONE] Default-Bilder Feature
- Verzeichnis: `default-photos/` im Projekt-Root (per Env `DEFAULT_PHOTOS_DIR` überschreibbar).
- Backend listet Bilder dynamisch (`GET /api/default-photos`) und serviert sie unter `/default-photos/<datei>`.
- Akzeptierte Formate: `.jpg`, `.jpeg`, `.png`, `.webp`. Sortierung: alphabetisch (locale `de`).
- Frontend-Komponente `DefaultPhotosPicker.vue` zeigt sie als Grid im Editor-Panel; Klick lädt das Bild als Foto.
- Im Docker-Setup als read-only Volume gemountet (`./default-photos:/default-photos:ro`).

### [DONE] Google Fonts
`Inter`, `Bebas Neue`, `Oswald`, `Playfair Display`, `Montserrat` werden via Google-Fonts-CSS in `index.html` geladen (inkl. `preconnect`). Canvas-Renderer rendert nach `document.fonts.ready` einmal neu, damit die Fonts auch im Canvas-Text greifen (statt System-Fallback).

### [DONE] Auto-Kontrast für Text
Setting `autoContrast` (Default: an). Vor dem Zeichnen von Titel und Stats sampelt der Renderer die Pixel unter dem Text-Bereich (Rec.709-Luminanz, Stride für Performance) und wählt **weiß auf dunklem Hintergrund** bzw. **schwarz auf hellem Hintergrund**, jeweils mit kontrastierendem Shadow. Schwellwert: 0.6.

### [DONE] Element-Resize
4 Eckhandles (NW/NE/SW/SE) an der Selection-Box. Pointer-Drag verändert `x/y/w/h`; bei aktivem Raster wird auf 8px gesnappt. Minimum-Größe: 2 % der Canvas-Kante (damit Elemente nicht versehentlich verschwinden). Locked Elements (Foto, Gradient) zeigen keine Handles.

### [DONE] Multer 2.x
Upgrade auf `multer@^2.0.1`. Storage-API ist kompatibel; keine Code-Änderung nötig.

### [DONE] npm audit
Von 11 Vulnerabilities (7 high) auf **2 moderate**:
- `bcrypt` von 5 → 6 (Node 22 → ok)
- `connect-sqlite3` komplett entfernt, durch eigenen `BetterSqliteSessionStore` ersetzt → fällt `sqlite3` / `node-gyp` / `tar` weg.
- Verbleibende 2 moderate: `esbuild` ≤ 0.24.2 transitiv via Vite. Betrifft **nur den Dev-Server**, nicht das Production-Bundle. Behoben wäre durch `vite@8`, was ein breaking change ist. Aktuell akzeptabel, da der Dev-Server nicht öffentlich exponiert wird.

### [DONE] Responsiveness
- Header, Toolbar, Buttons collapse auf kleinen Screens (Icons statt Labels unter `sm:`-Breakpoint).
- Editor-Layout: Canvas + Sidebar nebeneinander ab `lg:` (1024 px), darunter Sidebar unter Canvas (scrollbar, max `55vh`).
- Settings-Seite war bereits responsive (`max-w-3xl mx-auto`).

### [DONE] Live Setup-Detection
Router-`beforeEach` ruft jetzt bei **jeder Navigation** `auth.fetchStatus()` auf (nicht-blockierend nach dem ersten Mal). Wenn die DB extern manipuliert wird (z.B. User gelöscht) → die nächste Navigation zeigt automatisch wieder den Setup-Screen.

### [DONE] Session-Store eigenentwickelt
`BetterSqliteSessionStore` in `backend/src/db/sessionStore.ts`. Implementiert das `express-session.Store`-Interface (get/set/destroy/touch/all/length/clear) + 15-Minuten-Cleanup für expirierte Sessions. Migration: erkennt alte `connect-sqlite3`-Schemata und droppt sie, damit der Server nach Update startet.

---

## Verbleibende [TODO] / Hinweise

### [TODO] Logo-Position-Voreinstellung in Settings
Aktuell nur per Drag im Editor wählbar. Eine zusätzliche „Standardposition"-Auswahl in den Settings (z.B. Dropdown „oben rechts / oben links / unten Mitte") wäre eine kleine Erweiterung.

### [TODO] Resize: Aspect-Lock
Aktuell freies Resize. Mit Shift-Taste könnte man Seitenverhältnis halten. Klein, aber nicht implementiert.

### [HINWEIS] esbuild-Vulnerability (dev only)
2 moderate Severities verbleiben in `esbuild` (via Vite). Production-Bundle ist nicht betroffen — esbuild läuft nur im Vite-Dev-Server. Upgrade auf Vite 8 wäre breaking change und kann nachgezogen werden.

### [HINWEIS] CLAUDE.md (`claude.md`) inhaltlich unverändert
Das Spec-Dokument behält den ursprünglichen Wortlaut (Verweis auf `gravelcard/` und „GravelCard" im Layout-Diagramm). Die Implementierung ist überall auf „Activity Share" umgestellt.

### [HINWEIS] Default-Bilder im Repo
Das Verzeichnis `default-photos/` enthält initial nur eine `README.md`. Lege dort Bilder ab — sie tauchen sofort (nach „Liste neu laden") im Editor auf.

---

## Smoke-Test

End-to-End-Test mit `npm run build && npm start` (Production-Mode) durchgeführt:
- ✅ Frontend serviert (`GET / → 200`)
- ✅ Setup-Flow funktioniert
- ✅ Settings GET/PUT funktionieren
- ✅ Default-Photos: leeres Verzeichnis → leeres Array. Bild abgelegt → erscheint mit korrekter URL. `GET /default-photos/<datei>` serviert das Bild.
- ✅ Multer-Upload (Logo) funktioniert
- ✅ Passwort ändern funktioniert
- ✅ Docker-Build erfolgreich, Container serviert Frontend + API
- ✅ Auto-Migration: sessions.db mit altem Schema wird beim Start gedroppt

### Was noch im Browser zu testen wäre
- Crop-Modal (vue-advanced-cropper)
- Drag&Drop GPX und Foto
- Element-Drag und neue **Resize-Handles**
- **Default-Photos-Picker** im Editor-Panel
- Pfeiltasten-Nudge
- Undo/Redo-Stack
- Heatmap-Visualisierung
- **Auto-Kontrast bei hellem vs. dunklem Foto**
- Web Share API auf mobilen Geräten
- **Mobile-Layout** (Sidebar unter Canvas, kompakte Toolbar)
