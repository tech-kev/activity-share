# Activity Share

> Selbst gehostete Web-App zum Erstellen hochwertiger Übersichts-Grafiken aus GPX-Aktivitäten — im Stil von _adidas Running_.
> Foto als Hintergrund + Aktivitätsname + Routen-Umriss + Stats.

Activity Share ist ein **Fork und kompletter Neubau** des Open-Source-Projekts
**[InstaGPX](https://github.com/alterebro/instagpx)** von Jorge Moreno
([@alterebro](https://twitter.com/alterebro)). Der Original-Code (Vue 2 + Parcel)
liegt unter `reference/` als Referenz für GPX-Parsing- und Rendering-Logik.

## Stack

- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite, TypeScript (strict), Pinia, Vue Router, TailwindCSS, VueUse
- **Backend**: Node.js + Express, better-sqlite3, express-session, bcrypt, multer
- **Deployment**: Docker (Multi-Stage Build), docker-compose

## Quickstart (Entwicklung)

```bash
npm install
npm run dev   # startet Frontend (5173) und Backend (3000) parallel
```

Öffne <http://localhost:5173>. Beim ersten Start wirst du zum Setup-Bildschirm
geleitet und vergibst dein Login-Passwort.

## Build (lokal)

```bash
npm run build
npm start    # serviert Frontend + API auf Port 3000
```

## Docker

```bash
docker compose up -d --build
```

Anschließend auf `http://<host>:3000` erreichbar. Daten (SQLite + Uploads) liegen
im benannten Volume `activity-share-data`.

## Deployment via Portainer

Portainer ≥ 2.x kann Activity Share direkt aus diesem Repository deployen
("Stacks → Add stack → Repository"):

1. **Repository URL**: `https://github.com/tech-kev/activity-share`
2. **Reference**: `refs/heads/main`
3. **Compose path**: `docker-compose.yml`
4. **Deploy the stack**.

Portainer klont das Repo, baut das Image (Multi-Stage, dauert beim ersten Mal
~2 Minuten) und startet den Container auf Port 3000. Persistente Daten landen
im Named Volume `activity-share-data`.

### Default-Bilder

Optional: Lege Bilder in `default-photos/` im geklonten Repo ab — sie erscheinen
sofort als auswählbare Hintergründe im Editor. Beim Bind-Mount des Verzeichnisses
in Portainer können die Dateien live aktualisiert werden, ohne neu zu deployen.

### Setup nach erstem Start

Öffne `http://<host>:3000` und vergib beim ersten Aufruf dein Login-Passwort.
Danach landest du direkt im Editor.

## Verzeichnisstruktur

```
.
├── frontend/        Vue 3 + Vite (UI, GPX-Parsing client-seitig, Canvas-Rendering)
├── backend/         Express + SQLite (Auth, Settings, Logo-Upload)
├── reference/       Original InstaGPX-Code als Referenz
├── docker-compose.yml
├── Dockerfile       Multi-Stage Build
├── CLAUDE.md        Projektvision & Spezifikation
└── problems.md      Offene Punkte / Entscheidungen
```

## Lizenz

Activity Share steht — wie das Original-Projekt InstaGPX — unter der
[GNU General Public License v3.0](LICENSE).

**InstaGPX** ([instagpx.com](https://instagpx.com)) · Original-Konzept &
Copyright (C) 2019-2020 · Jorge Moreno,
[moro.es](https://moro.es) ([@alterebro](https://twitter.com/alterebro)).

Dieses Programm ist freie Software und kann unter den Bedingungen der
GNU General Public License Version 3 verbreitet und/oder modifiziert werden.
Es wird in der Hoffnung verteilt, dass es nützlich ist, jedoch **ohne jegliche
Gewährleistung**. Details siehe <https://www.gnu.org/licenses/gpl-3.0.html>.
