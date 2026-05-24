import { defineStore } from 'pinia';

export interface DefaultPhoto {
  name: string;
  url: string;
}

interface State {
  loaded: boolean;
  loading: boolean;
  photos: DefaultPhoto[];
  selectedUrl: string | null;
  error: string | null;
}

export const useDefaultPhotosStore = defineStore('defaultPhotos', {
  state: (): State => ({
    loaded: false,
    loading: false,
    photos: [],
    selectedUrl: null,
    error: null,
  }),
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return;
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch('/api/default-photos', { credentials: 'include' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as { photos: DefaultPhoto[] };
        this.photos = data.photos ?? [];
        this.loaded = true;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Default-Bilder konnten nicht geladen werden';
      } finally {
        this.loading = false;
      }
    },
    select(url: string | null) {
      this.selectedUrl = url;
    },
  },
});
