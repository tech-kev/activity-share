import { defineStore } from 'pinia';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types';

interface SettingsState {
  loaded: boolean;
  saving: boolean;
  error: string | null;
  values: AppSettings;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    loaded: false,
    saving: false,
    error: null,
    values: { ...DEFAULT_SETTINGS },
  }),
  actions: {
    async load() {
      this.error = null;
      try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const remote = (await res.json()) as Partial<AppSettings>;
        this.values = { ...DEFAULT_SETTINGS, ...remote };
        this.loaded = true;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Einstellungen konnten nicht geladen werden';
      }
    },
    async save(patch: Partial<AppSettings>) {
      this.saving = true;
      this.error = null;
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        this.values = { ...this.values, ...patch };
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
      } finally {
        this.saving = false;
      }
    },
    resetLocal() {
      this.values = { ...DEFAULT_SETTINGS };
    },
  },
});
