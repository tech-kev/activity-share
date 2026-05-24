<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useKomootStore, komootImageProxyUrl } from '@/stores/komoot';
import { useGpxStore } from '@/stores/gpx';
import { useEditorStore } from '@/stores/editor';

const emit = defineEmits<{ (e: 'close'): void }>();

const komoot = useKomootStore();
const gpx = useGpxStore();
const editor = useEditorStore();

const loginEmail = ref('');
const loginPassword = ref('');
const importError = ref<string | null>(null);

onMounted(async () => {
  await komoot.fetchStatus();
  if (komoot.authenticated) await komoot.loadTours(0);
});

function close() {
  emit('close');
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

async function onLogin() {
  if (!loginEmail.value || !loginPassword.value) return;
  const ok = await komoot.login(loginEmail.value, loginPassword.value);
  if (ok) {
    loginPassword.value = '';
    await komoot.loadTours(0);
  }
}

async function onLogout() {
  await komoot.logout();
}

async function onImport(tourId: string) {
  importError.value = null;
  try {
    const text = await komoot.fetchGpx(tourId);
    gpx.loadText(text, `komoot-${tourId}.gpx`);
    if (gpx.stats?.name) editor.setTitleFromGpx(gpx.stats.name);
    if (gpx.error) {
      importError.value = gpx.error;
      return;
    }
    close();
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Import fehlgeschlagen';
  }
}

function formatKm(m: number): string {
  return `${(m / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')} h` : `${m} min`;
}
function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const canPrev = computed(() => komoot.page > 0);
const canNext = computed(() => komoot.page + 1 < komoot.totalPages);

async function prev() {
  if (canPrev.value) await komoot.loadTours(komoot.page - 1);
}
async function next() {
  if (canNext.value) await komoot.loadTours(komoot.page + 1);
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6" @click.self="close">
    <div class="card flex max-h-[92vh] w-full max-w-5xl flex-col gap-3 overflow-hidden">
      <header class="flex items-center justify-between border-b border-ink-800 pb-2">
        <h2 class="font-display text-xl tracking-wide">Aus Komoot importieren</h2>
        <button class="btn-ghost" @click="close">✕</button>
      </header>

      <!-- Login form -->
      <div v-if="!komoot.authenticated" class="space-y-3">
        <p class="text-sm text-ink-300">
          Verbinde dein Komoot-Konto, um deine aufgezeichneten Touren auswählen
          und ihre GPX-Dateien direkt importieren zu können.
        </p>
        <form class="space-y-3" @submit.prevent="onLogin">
          <div>
            <label class="label">E-Mail (Komoot-Konto)</label>
            <input
              type="email"
              class="input"
              v-model="loginEmail"
              autocomplete="username"
              required
            />
          </div>
          <div>
            <label class="label">Passwort</label>
            <input
              type="password"
              class="input"
              v-model="loginPassword"
              autocomplete="current-password"
              required
            />
          </div>
          <p v-if="komoot.error" class="text-sm text-red-400">{{ komoot.error }}</p>
          <button type="submit" class="btn-primary w-full" :disabled="komoot.loginBusy">
            {{ komoot.loginBusy ? 'Verbinde …' : 'Mit Komoot verbinden' }}
          </button>
          <p class="text-xs text-ink-400">
            Hinweis: Es wird die inoffizielle Komoot-Web-API verwendet (kein
            offizielles OAuth). Dein Passwort wird einmalig gegen Komoot
            ausgetauscht und nur das Session-Token im Backend gespeichert.
          </p>
        </form>
      </div>

      <!-- Tour list -->
      <div v-else class="flex flex-1 flex-col gap-3 overflow-hidden">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-ink-300">
            Verbunden: <strong>{{ komoot.displayName ?? komoot.email }}</strong>
          </span>
          <button class="btn-ghost text-xs" @click="onLogout">Trennen</button>
          <span class="ml-auto inline-flex rounded-md border border-ink-700 p-0.5 text-xs">
            <button
              class="rounded px-3 py-1"
              :class="komoot.filterType === 'tour_recorded' ? 'bg-accent text-white' : 'text-ink-300'"
              @click="komoot.setFilterType('tour_recorded')"
            >
              Aufgezeichnet
            </button>
            <button
              class="rounded px-3 py-1"
              :class="komoot.filterType === 'tour_planned' ? 'bg-accent text-white' : 'text-ink-300'"
              @click="komoot.setFilterType('tour_planned')"
            >
              Geplant
            </button>
          </span>
        </div>

        <p v-if="komoot.error" class="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {{ komoot.error }}
        </p>
        <p v-if="importError" class="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {{ importError }}
        </p>

        <div class="flex-1 overflow-y-auto">
          <div
            v-if="komoot.loadingTours && komoot.tours.length === 0"
            class="py-8 text-center text-ink-300"
          >
            Lade Touren …
          </div>
          <div
            v-else-if="komoot.tours.length === 0"
            class="py-8 text-center text-ink-300"
          >
            Keine Touren gefunden.
          </div>
          <ul v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <li
              v-for="t in komoot.tours"
              :key="t.id"
              class="flex items-center gap-3 rounded-md border border-ink-800 bg-ink-850 p-2 hover:border-accent"
            >
              <img
                v-if="t.mapImage"
                :src="komootImageProxyUrl(t.mapImage)!"
                alt=""
                class="h-16 w-24 shrink-0 rounded-sm object-cover bg-ink-900"
                loading="lazy"
              />
              <div v-else class="h-16 w-24 shrink-0 rounded-sm bg-ink-900" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium" :title="t.name">{{ t.name }}</p>
                <p class="truncate text-xs text-ink-400">
                  {{ formatDate(t.date) }} · {{ formatKm(t.distance) }} · {{ formatDuration(t.duration) }}
                </p>
                <p class="text-xs text-ink-500">{{ t.sport }}</p>
              </div>
              <button
                class="btn-primary !px-2 !py-1 text-xs"
                :disabled="komoot.importing === t.id"
                @click="onImport(t.id)"
              >
                {{ komoot.importing === t.id ? '…' : 'Importieren' }}
              </button>
            </li>
          </ul>
        </div>

        <footer class="flex items-center justify-between border-t border-ink-800 pt-2 text-sm text-ink-300">
          <span>
            Seite {{ komoot.page + 1 }} von {{ Math.max(1, komoot.totalPages) }}
            <span v-if="komoot.totalElements > 0" class="text-ink-500">
              ({{ komoot.totalElements }} Touren)
            </span>
          </span>
          <div class="flex gap-1">
            <button class="btn-secondary !px-3 !py-1" :disabled="!canPrev || komoot.loadingTours" @click="prev">
              ← Vorherige
            </button>
            <button class="btn-secondary !px-3 !py-1" :disabled="!canNext || komoot.loadingTours" @click="next">
              Nächste →
            </button>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>
