import { defineStore } from 'pinia';

export interface KomootTour {
  id: string;
  name: string;
  sport: string;
  distance: number; // m
  duration: number; // s
  elevationUp?: number;
  elevationDown?: number;
  date?: string;
  mapImage?: string;
  type: string;
}

interface ToursPage {
  tours: KomootTour[];
  totalElements: number;
  totalPages: number;
  page: number;
}

interface State {
  authenticated: boolean;
  email: string | null;
  displayName: string | null;
  loadingStatus: boolean;
  loadingTours: boolean;
  loginBusy: boolean;
  importing: string | null; // tour id being imported
  error: string | null;
  tours: KomootTour[];
  page: number;
  totalPages: number;
  totalElements: number;
  filterType: 'tour_recorded' | 'tour_planned';
}

export const useKomootStore = defineStore('komoot', {
  state: (): State => ({
    authenticated: false,
    email: null,
    displayName: null,
    loadingStatus: false,
    loadingTours: false,
    loginBusy: false,
    importing: null,
    error: null,
    tours: [],
    page: 0,
    totalPages: 1,
    totalElements: 0,
    filterType: 'tour_recorded',
  }),
  actions: {
    async fetchStatus() {
      this.loadingStatus = true;
      this.error = null;
      try {
        const res = await fetch('/api/komoot/status', { credentials: 'include' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        this.authenticated = !!data.authenticated;
        this.email = data.email ?? null;
        this.displayName = data.displayName ?? null;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Status-Abfrage fehlgeschlagen';
      } finally {
        this.loadingStatus = false;
      }
    },
    async login(email: string, password: string): Promise<boolean> {
      this.loginBusy = true;
      this.error = null;
      try {
        const res = await fetch('/api/komoot/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Status ${res.status}`);
        }
        const data = await res.json();
        this.authenticated = !!data.authenticated;
        this.email = data.email ?? null;
        this.displayName = data.displayName ?? null;
        return true;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Login fehlgeschlagen';
        return false;
      } finally {
        this.loginBusy = false;
      }
    },
    async logout() {
      this.error = null;
      try {
        await fetch('/api/komoot/logout', { method: 'POST', credentials: 'include' });
      } catch {
        /* ignore */
      }
      this.authenticated = false;
      this.email = null;
      this.displayName = null;
      this.tours = [];
      this.page = 0;
      this.totalPages = 1;
    },
    async loadTours(page = 0) {
      if (!this.authenticated) return;
      this.loadingTours = true;
      this.error = null;
      try {
        const params = new URLSearchParams({
          type: this.filterType,
          page: String(page),
          limit: '24',
        });
        const res = await fetch(`/api/komoot/tours?${params.toString()}`, {
          credentials: 'include',
        });
        if (res.status === 401) {
          this.authenticated = false;
          this.email = null;
          throw new Error('Komoot-Session abgelaufen — bitte neu verbinden');
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Status ${res.status}`);
        }
        const data = (await res.json()) as ToursPage;
        this.tours = data.tours;
        this.page = data.page;
        this.totalPages = data.totalPages;
        this.totalElements = data.totalElements;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Laden fehlgeschlagen';
      } finally {
        this.loadingTours = false;
      }
    },
    setFilterType(type: 'tour_recorded' | 'tour_planned') {
      if (type === this.filterType) return;
      this.filterType = type;
      void this.loadTours(0);
    },
    async fetchGpx(tourId: string): Promise<string> {
      this.importing = tourId;
      try {
        const res = await fetch(`/api/komoot/tours/${encodeURIComponent(tourId)}/gpx`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Status ${res.status}`);
        }
        return await res.text();
      } finally {
        this.importing = null;
      }
    },
  },
});

export function komootImageProxyUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  return `/api/komoot/image?url=${encodeURIComponent(rawUrl)}`;
}
