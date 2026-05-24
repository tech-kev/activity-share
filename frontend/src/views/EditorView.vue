<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useEditorStore } from '@/stores/editor';
import { useGpxStore } from '@/stores/gpx';
import EditorCanvas from '@/components/editor/EditorCanvas.vue';
import EditorPanel from '@/components/editor/EditorPanel.vue';
import EditorToolbar from '@/components/editor/EditorToolbar.vue';
import PhotoCropperModal from '@/components/editor/PhotoCropperModal.vue';
import { useKeyboardNudge } from '@/composables/useKeyboardNudge';
import { useUndoRedoShortcuts } from '@/composables/useUndoRedo';
import { exportImage, shareImage } from '@/utils/exporter';

const auth = useAuthStore();
const settings = useSettingsStore();
const editor = useEditorStore();
const gpx = useGpxStore();
const router = useRouter();
const cropperOpen = ref(false);
const exporting = ref(false);
const shareError = ref<string | null>(null);

useKeyboardNudge();
useUndoRedoShortcuts(editor);

onMounted(async () => {
  if (!settings.loaded) {
    await settings.load();
    editor.setFormat(settings.values.defaultFormat);
    editor.setActivity(settings.values.defaultActivity);
    editor.setStats(settings.values.defaultStats);
    if (settings.values.defaultLayout) editor.setLayout(settings.values.defaultLayout);
  }
});

async function onLogout() {
  await auth.logout();
  router.push({ name: 'login' });
}

const canExport = computed(() => !!editor.photo.croppedUrl || !!editor.photo.originalUrl || !!gpx.stats);

async function onExport() {
  exporting.value = true;
  try {
    await exportImage();
  } finally {
    exporting.value = false;
  }
}

async function onShare() {
  shareError.value = null;
  try {
    await shareImage();
  } catch (e) {
    shareError.value = e instanceof Error ? e.message : 'Teilen nicht möglich';
  }
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <header class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 bg-ink-900 px-3 py-2 sm:px-4 sm:py-3">
      <div class="flex items-center gap-3">
        <span class="font-display text-lg tracking-wide sm:text-xl">Activity Share</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-secondary !px-3 sm:!px-4" @click="router.push({ name: 'settings' })">
          <span class="hidden sm:inline">Einstellungen</span><span class="sm:hidden">⚙</span>
        </button>
        <button class="btn-ghost !px-3 sm:!px-4" @click="onLogout">
          <span class="hidden sm:inline">Abmelden</span><span class="sm:hidden">↪</span>
        </button>
      </div>
    </header>

    <EditorToolbar>
      <button
        class="btn-secondary !px-2 sm:!px-3"
        :disabled="!editor.photo.originalUrl"
        @click="cropperOpen = true"
        title="Foto zuschneiden"
      >
        ✂<span class="ml-1 hidden sm:inline">Crop</span>
      </button>
      <span class="mx-1 hidden text-ink-500 sm:inline">|</span>
      <button class="btn-primary !px-2 sm:!px-3" :disabled="!canExport || exporting" @click="onExport">
        <span class="sm:hidden">💾</span><span class="hidden sm:inline">{{ exporting ? 'Exportiere …' : '💾 PNG exportieren' }}</span>
      </button>
      <button class="btn-secondary !px-2 sm:!px-3" :disabled="!canExport" @click="onShare">
        <span class="sm:hidden">📤</span><span class="hidden sm:inline">📤 Teilen</span>
      </button>
      <p v-if="shareError" class="ml-2 text-xs text-red-400">{{ shareError }}</p>
    </EditorToolbar>

    <main class="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <section class="flex min-h-0 flex-1 items-center justify-center bg-ink-950 p-3 sm:p-4 lg:p-6">
        <EditorCanvas />
      </section>
      <aside
        class="max-h-[55vh] w-full overflow-y-auto border-t border-ink-800 bg-ink-900 lg:max-h-none lg:w-[26rem] lg:border-l lg:border-t-0"
      >
        <EditorPanel />
      </aside>
    </main>

    <PhotoCropperModal v-if="cropperOpen" @close="cropperOpen = false" />
  </div>
</template>
