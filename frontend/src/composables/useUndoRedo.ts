import { onMounted, onBeforeUnmount } from 'vue';
import type { PiniaPluginContext } from 'pinia';
import type { Pinia, Store } from 'pinia';

/**
 * Einfache Undo/Redo-Implementierung für einen Pinia-Store.
 * Speichert Snapshots des State bei jeder Mutation in einer History.
 * Undo (Ctrl+Z) / Redo (Ctrl+Shift+Z) bedienen den Stack.
 *
 * Vereinfachtes Modell: wir snapshotten den kompletten Store-State (außer
 * Photo-URLs, die als File-Objekte/Blob-URLs nicht serialisierbar sind).
 */

type Snapshot = Record<string, unknown>;

interface History {
  past: Snapshot[];
  future: Snapshot[];
  current: Snapshot | null;
  recording: boolean;
}

const histories = new WeakMap<Store, History>();

const MAX_HISTORY = 50;

/** Pinia-Plugin: registriert History für gewünschte Stores. */
export function createUndoRedoPlugin(opts: { stores: string[] }) {
  return (context: PiniaPluginContext) => {
    if (!opts.stores.includes(context.store.$id)) return;
    const store = context.store;
    const history: History = { past: [], future: [], current: snapshot(store), recording: true };
    histories.set(store, history);

    store.$subscribe(
      () => {
        if (!history.recording) return;
        if (history.current) history.past.push(history.current);
        if (history.past.length > MAX_HISTORY) history.past.shift();
        history.current = snapshot(store);
        history.future = [];
      },
      { detached: true },
    );
  };
}

function snapshot(store: Store): Snapshot {
  // Filter Photo-URLs aus dem Snapshot (revoken sonst beim Restore alte URLs)
  // — wir nehmen alles außer photo/originalUrl/croppedUrl/natural.
  const raw = JSON.parse(JSON.stringify(store.$state));
  if (raw && typeof raw === 'object' && 'photo' in raw) {
    delete raw.photo;
  }
  return raw;
}

function applySnapshot(store: Store, snap: Snapshot) {
  const history = histories.get(store);
  if (history) history.recording = false;
  store.$patch(snap);
  if (history) history.recording = true;
}

export function undo(store: Store): boolean {
  const h = histories.get(store);
  if (!h || h.past.length === 0) return false;
  const previous = h.past.pop()!;
  if (h.current) h.future.push(h.current);
  h.current = previous;
  applySnapshot(store, previous);
  return true;
}

export function redo(store: Store): boolean {
  const h = histories.get(store);
  if (!h || h.future.length === 0) return false;
  const next = h.future.pop()!;
  if (h.current) h.past.push(h.current);
  h.current = next;
  applySnapshot(store, next);
  return true;
}

export function canUndo(store: Store): boolean {
  return (histories.get(store)?.past.length ?? 0) > 0;
}

export function canRedo(store: Store): boolean {
  return (histories.get(store)?.future.length ?? 0) > 0;
}

/** Composable: bindet Ctrl+Z / Ctrl+Shift+Z für einen gegebenen Store. */
export function useUndoRedoShortcuts(store: Store) {
  function onKey(e: KeyboardEvent) {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;
    if (e.key === 'z' || e.key === 'Z') {
      // Nur reagieren, wenn nicht in einem Input/Textarea/Select fokussiert
      const t = document.activeElement;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo(store);
      else undo(store);
    }
  }
  onMounted(() => window.addEventListener('keydown', onKey));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
}

/** Initial-Snapshot für einen Store löschen — z.B. nach „Reset to Defaults“ */
export function clearHistory(store: Store) {
  const h = histories.get(store);
  if (!h) return;
  h.past = [];
  h.future = [];
  h.current = snapshot(store);
}

// Helper damit unused import von Pinia-Typen lint-clean ist
export type { Pinia };
