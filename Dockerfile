# syntax=docker/dockerfile:1.7

# --- Stage 1: Frontend Build ---
FROM node:22-alpine AS frontend-build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Nur Frontend-Workspace installieren spart Zeit, aber wir nutzen den vollen install
# damit das Lockfile valide bleibt. Können später optimieren.
RUN npm install --include=optional --workspaces --include-workspace-root=false

COPY frontend ./frontend
RUN npm --workspace frontend run build


# --- Stage 2: Backend Build ---
FROM node:22-alpine AS backend-build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm install --workspace backend

COPY backend ./backend
RUN npm --workspace backend run build


# --- Stage 3: Runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache tini

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    UPLOADS_DIR=/data/uploads \
    FRONTEND_DIST=/app/frontend/dist

# Backend production deps
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install --omit=dev --workspace backend && npm cache clean --force

# Built artefacts
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/dist/server.js"]
