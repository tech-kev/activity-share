import { defineStore } from 'pinia';

interface AuthState {
  loading: boolean;
  setupComplete: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    loading: true,
    setupComplete: false,
    isAuthenticated: false,
    error: null,
  }),
  actions: {
    async fetchStatus() {
      // Beim ersten Aufruf zeigt App.vue einen Lade-Screen; spätere Aufrufe
      // (Router-Navigation) sollen die UI nicht blocken — daher Loading-Flag
      // nur beim ersten Mal setzen.
      const initial = this.loading;
      try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        this.setupComplete = !!data.setupComplete;
        this.isAuthenticated = !!data.authenticated;
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Unbekannter Fehler';
      } finally {
        if (initial) this.loading = false;
      }
    },
    async setup(password: string) {
      this.error = null;
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        this.error = body.error ?? 'Setup fehlgeschlagen';
        return false;
      }
      this.setupComplete = true;
      this.isAuthenticated = true;
      return true;
    },
    async login(password: string) {
      this.error = null;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        this.error = body.error ?? 'Login fehlgeschlagen';
        return false;
      }
      this.isAuthenticated = true;
      return true;
    },
    async logout() {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      this.isAuthenticated = false;
    },
    async changePassword(currentPassword: string, newPassword: string) {
      this.error = null;
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        this.error = body.error ?? 'Passwort konnte nicht geändert werden';
        return false;
      }
      return true;
    },
  },
});
