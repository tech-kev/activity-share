import { defineStore } from 'pinia';
import type { GpxStats, StatOverrides } from '@/types';
import { parseGpx } from '@/utils/gpxParser';

interface GpxState {
  stats: GpxStats | null;
  fileName: string | null;
  error: string | null;
  parsing: boolean;
  overrides: StatOverrides;
}

export const useGpxStore = defineStore('gpx', {
  state: (): GpxState => ({
    stats: null,
    fileName: null,
    error: null,
    parsing: false,
    overrides: {},
  }),
  getters: {
    hasGpx: (state) => state.stats !== null,
  },
  actions: {
    async loadFile(file: File) {
      this.error = null;
      this.parsing = true;
      try {
        const text = await file.text();
        this.stats = parseGpx(text);
        this.fileName = file.name;
        this.overrides = {};
      } catch (e) {
        this.stats = null;
        this.fileName = null;
        this.error = e instanceof Error ? e.message : 'GPX-Datei konnte nicht gelesen werden';
      } finally {
        this.parsing = false;
      }
    },
    setOverride(key: string, value: string | null) {
      if (value === null || value === '') {
        delete this.overrides[key];
      } else {
        this.overrides[key] = value;
      }
    },
    clear() {
      this.stats = null;
      this.fileName = null;
      this.error = null;
      this.overrides = {};
    },
  },
});
