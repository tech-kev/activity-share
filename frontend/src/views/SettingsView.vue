<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { useEditorStore } from '@/stores/editor';
import { useAuthStore } from '@/stores/auth';
import {
  DEFAULT_SETTINGS,
  FORMAT_SIZES,
  type AppSettings,
  type ImageFormat,
  type StatKey,
} from '@/types';

const router = useRouter();
const settings = useSettingsStore();
const editor = useEditorStore();
const auth = useAuthStore();

const localValues = ref<AppSettings>({ ...DEFAULT_SETTINGS });
const status = ref<string | null>(null);
const error = ref<string | null>(null);
const logoUploading = ref(false);
const logoInput = ref<HTMLInputElement | null>(null);

const passwordCurrent = ref('');
const passwordNew = ref('');
const passwordRepeat = ref('');
const passwordStatus = ref<string | null>(null);

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  localValues.value = { ...settings.values };
});

const statKeys: { key: StatKey; label: string }[] = [
  { key: 'distance', label: 'Distanz' },
  { key: 'duration', label: 'Dauer (gesamt)' },
  { key: 'movingDuration', label: 'Dauer (Bewegung)' },
  { key: 'elevationGain', label: 'HM aufwärts' },
  { key: 'elevationLoss', label: 'HM abwärts' },
  { key: 'elevationMax', label: 'Max. Höhe' },
  { key: 'avgSpeed', label: 'Ø Tempo' },
  { key: 'maxSpeed', label: 'Max. Tempo' },
  { key: 'avgPace', label: 'Ø Pace' },
  { key: 'startDate', label: 'Datum' },
];

const fontOptions = ['Inter', 'Bebas Neue', 'Oswald', 'Playfair Display', 'Montserrat'];

const isStatSelected = computed(() => (key: StatKey) => localValues.value.defaultStats.includes(key));

function toggleStat(key: StatKey, checked: boolean) {
  const set = new Set(localValues.value.defaultStats);
  if (checked) set.add(key);
  else set.delete(key);
  localValues.value.defaultStats = Array.from(set);
}

async function save() {
  status.value = null;
  error.value = null;

  // Aktivitäten säubern: Whitespace trimmen, leere entfernen, Duplikate dedupen
  const cleanedActivities = Array.from(
    new Set(
      (localValues.value.activities ?? [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  );
  localValues.value.activities = cleanedActivities;

  // Default-Aktivität validieren — falls gelöscht, auf erste Aktivität fallen
  if (
    !cleanedActivities.includes(localValues.value.defaultActivity) &&
    cleanedActivities.length > 0
  ) {
    localValues.value.defaultActivity = cleanedActivities[0];
  }

  await settings.save({
    activities: cleanedActivities,
    defaultActivity: localValues.value.defaultActivity,
    defaultStats: localValues.value.defaultStats,
    defaultFormat: localValues.value.defaultFormat,
    outlineColor: localValues.value.outlineColor,
    outlineWidth: localValues.value.outlineWidth,
    heatmapMode: localValues.value.heatmapMode,
    fontFamily: localValues.value.fontFamily,
    gradientStrength: localValues.value.gradientStrength,
    autoContrast: localValues.value.autoContrast,
  });
  if (settings.error) {
    error.value = settings.error;
  } else {
    status.value = 'Einstellungen gespeichert';
    // Wenn die aktuell im Editor selektierte Aktivität gelöscht wurde,
    // auf neue Default-Aktivität umstellen.
    if (!cleanedActivities.includes(editor.activity) && cleanedActivities.length > 0) {
      editor.setActivity(localValues.value.defaultActivity);
    }
  }
}

function addActivity() {
  if (!localValues.value.activities) localValues.value.activities = [];
  localValues.value.activities.push('');
}

function removeActivity(idx: number) {
  localValues.value.activities = localValues.value.activities.filter((_, i) => i !== idx);
}

async function uploadLogo(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  logoUploading.value = true;
  const form = new FormData();
  form.append('logo', file);
  try {
    const res = await fetch('/api/upload/logo', {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) throw new Error(`Upload fehlgeschlagen (${res.status})`);
    const data = await res.json();
    localValues.value.logoPath = data.path;
    settings.values.logoPath = data.path;
    status.value = 'Logo hochgeladen';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Logo-Upload fehlgeschlagen';
  } finally {
    logoUploading.value = false;
    input.value = '';
  }
}

async function removeLogo() {
  try {
    const res = await fetch('/api/upload/logo', { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    localValues.value.logoPath = null;
    settings.values.logoPath = null;
    status.value = 'Logo entfernt';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Logo konnte nicht entfernt werden';
  }
}

async function saveCurrentLayout() {
  await settings.save({ defaultLayout: editor.elements });
  if (settings.error) error.value = settings.error;
  else status.value = 'Aktuelles Layout als Standard gespeichert';
}

async function resetFactoryDefaults() {
  if (!window.confirm('Wirklich alle Einstellungen auf Werks-Defaults zurücksetzen?')) return;
  localValues.value = { ...DEFAULT_SETTINGS };
  await settings.save({ ...DEFAULT_SETTINGS, defaultLayout: null });
  // Layout im Editor zurücksetzen
  editor.resetLayout(null);
  status.value = 'Werks-Defaults wiederhergestellt';
}

async function changePassword() {
  passwordStatus.value = null;
  if (passwordNew.value.length < 8) {
    passwordStatus.value = 'Mindestens 8 Zeichen';
    return;
  }
  if (passwordNew.value !== passwordRepeat.value) {
    passwordStatus.value = 'Passwörter stimmen nicht überein';
    return;
  }
  const ok = await auth.changePassword(passwordCurrent.value, passwordNew.value);
  if (ok) {
    passwordStatus.value = 'Passwort geändert';
    passwordCurrent.value = '';
    passwordNew.value = '';
    passwordRepeat.value = '';
  } else {
    passwordStatus.value = auth.error;
  }
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <header class="flex items-center justify-between border-b border-ink-800 bg-ink-900 px-4 py-3">
      <div class="flex items-center gap-3">
        <button class="btn-ghost" @click="router.push({ name: 'editor' })">← Zurück</button>
        <span class="font-display text-xl tracking-wide">Einstellungen</span>
      </div>
      <button class="btn-primary" :disabled="settings.saving" @click="save">
        {{ settings.saving ? 'Speichere …' : 'Speichern' }}
      </button>
    </header>

    <main class="flex-1 overflow-y-auto bg-ink-950 px-4 py-6 sm:px-6">
      <div class="mx-auto max-w-3xl space-y-6">
        <p v-if="status" class="rounded-md bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200">{{ status }}</p>
        <p v-if="error" class="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-200">{{ error }}</p>

        <!-- Editor-Defaults -->
        <section class="card space-y-4">
          <h2 class="font-display text-lg">Editor-Standards</h2>

          <div>
            <label class="label">Standard-Aktivität</label>
            <select class="input" v-model="localValues.defaultActivity">
              <option v-for="a in localValues.activities" :key="a" :value="a">{{ a }}</option>
            </select>
            <p class="mt-1 text-xs text-ink-400">
              Im Editor anfangs ausgewählte Aktivität (muss in der Liste unten enthalten sein).
            </p>
          </div>

          <div>
            <label class="label">Standard-Format</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(fs, key) in FORMAT_SIZES"
                :key="key"
                type="button"
                class="btn-secondary"
                :class="localValues.defaultFormat === key ? '!bg-accent !text-white' : ''"
                @click="localValues.defaultFormat = key as ImageFormat"
              >
                {{ fs.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="label">Standard-Stats</label>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="s in statKeys" :key="s.key" class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="accent-accent"
                  :checked="isStatSelected(s.key)"
                  @change="(e) => toggleStat(s.key, (e.target as HTMLInputElement).checked)"
                />
                {{ s.label }}
              </label>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-ink-300">
              Aktuelle Editor-Positionen als Standard speichern (Reset im Editor lädt diese Positionen).
            </p>
            <button class="btn-secondary" @click="saveCurrentLayout">Aktuelles Layout speichern</button>
          </div>
        </section>

        <!-- Aktivitäten -->
        <section class="card space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-lg">Aktivitäten</h2>
            <button class="btn-secondary !px-3 !py-1" @click="addActivity">+ Neu</button>
          </div>
          <p class="text-sm text-ink-300">
            Liste der wählbaren Aktivitäten im Editor. Du kannst sie umbenennen,
            löschen oder ergänzen. Wird beim Speichern persistiert.
          </p>
          <div class="space-y-1">
            <div
              v-for="(_, idx) in localValues.activities"
              :key="idx"
              class="flex items-center gap-2"
            >
              <input
                class="input flex-1"
                v-model="localValues.activities[idx]"
                placeholder="z.B. Mountainbike"
              />
              <button
                type="button"
                class="rounded p-2 text-ink-300 hover:bg-ink-800 hover:text-red-300"
                title="Aktivität löschen"
                @click="removeActivity(idx)"
              >
                ✕
              </button>
            </div>
          </div>
          <p v-if="localValues.activities.length === 0" class="text-xs text-ink-400">
            Keine Aktivitäten — füge mindestens eine hinzu.
          </p>
        </section>

        <!-- Style -->
        <section class="card space-y-4">
          <h2 class="font-display text-lg">Stil</h2>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="label">Outline-Farbe</label>
              <input type="color" class="h-10 w-full rounded border border-ink-700 bg-ink-900" v-model="localValues.outlineColor" />
            </div>
            <div>
              <label class="label">
                Outline-Strichstärke: {{ localValues.outlineWidth }}
              </label>
              <input type="range" min="1" max="12" step="1" class="w-full accent-accent" v-model.number="localValues.outlineWidth" />
            </div>
          </div>

          <div>
            <label class="label">Heatmap-Modus</label>
            <select class="input" v-model="localValues.heatmapMode">
              <option value="off">Aus (einfarbig)</option>
              <option value="speed">Geschwindigkeit</option>
              <option value="elevation">Höhe</option>
            </select>
            <p class="mt-1 text-xs text-ink-400">
              Färbt die Route entsprechend Geschwindigkeit oder Höhe segmentweise ein.
            </p>
          </div>

          <div>
            <label class="label">Schriftart</label>
            <select class="input" v-model="localValues.fontFamily">
              <option v-for="f in fontOptions" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>

          <div>
            <label class="label">
              Gradient-Overlay-Stärke: {{ localValues.gradientStrength.toFixed(2) }}
            </label>
            <input type="range" min="0" max="1" step="0.05" class="w-full accent-accent" v-model.number="localValues.gradientStrength" />
          </div>

          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" class="accent-accent" v-model="localValues.autoContrast" />
            <span>Auto-Kontrast für Text (analysiert Hintergrundhelligkeit, wählt Weiß/Schwarz)</span>
          </label>
        </section>

        <!-- Logo -->
        <section class="card space-y-3">
          <h2 class="font-display text-lg">Logo / Wasserzeichen</h2>
          <div v-if="localValues.logoPath" class="flex items-center gap-3">
            <img :src="localValues.logoPath" alt="Logo" class="h-16 w-16 rounded-md bg-ink-800 object-contain p-2" />
            <button class="btn-secondary" @click="removeLogo">Entfernen</button>
          </div>
          <button v-else class="btn-secondary" :disabled="logoUploading" @click="logoInput?.click()">
            {{ logoUploading ? 'Lade hoch …' : 'Logo hochladen' }}
          </button>
          <input ref="logoInput" type="file" class="hidden" accept="image/png,image/jpeg,image/svg+xml,image/webp" @change="uploadLogo" />
          <p class="text-xs text-ink-400">Max. 5 MB. PNG mit Transparenz empfohlen.</p>
        </section>

        <!-- Passwort -->
        <section class="card space-y-3">
          <h2 class="font-display text-lg">Passwort ändern</h2>
          <div>
            <label class="label">Aktuelles Passwort</label>
            <input type="password" class="input" v-model="passwordCurrent" autocomplete="current-password" />
          </div>
          <div>
            <label class="label">Neues Passwort</label>
            <input type="password" class="input" v-model="passwordNew" autocomplete="new-password" />
          </div>
          <div>
            <label class="label">Neues Passwort wiederholen</label>
            <input type="password" class="input" v-model="passwordRepeat" autocomplete="new-password" />
          </div>
          <p v-if="passwordStatus" class="text-sm" :class="passwordStatus === 'Passwort geändert' ? 'text-emerald-300' : 'text-red-400'">
            {{ passwordStatus }}
          </p>
          <button class="btn-secondary" @click="changePassword">Passwort ändern</button>
        </section>

        <!-- Reset -->
        <section class="card">
          <h2 class="mb-2 font-display text-lg text-red-300">Gefahrenzone</h2>
          <button class="btn-secondary !text-red-300" @click="resetFactoryDefaults">
            Alle Einstellungen auf Werks-Defaults zurücksetzen
          </button>
        </section>
      </div>
    </main>
  </div>
</template>
