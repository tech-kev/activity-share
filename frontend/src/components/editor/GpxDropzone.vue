<script setup lang="ts">
import { ref } from 'vue';
import { useGpxStore } from '@/stores/gpx';
import { useEditorStore } from '@/stores/editor';
import { useDropzone } from '@/composables/useDropzone';

const gpx = useGpxStore();
const editor = useEditorStore();
const dropEl = ref<HTMLDivElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

async function handleFile(file: File) {
  await gpx.loadFile(file);
  if (gpx.stats) {
    editor.setTitleFromGpx(gpx.stats.name);
  }
}

const { isOver, attach } = useDropzone(dropEl, {
  accept: ['.gpx', 'application/gpx+xml', 'application/xml', 'text/xml'],
  onDrop: handleFile,
});

function onSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) handleFile(file);
  input.value = '';
}

// attach on mount
import { onMounted } from 'vue';
onMounted(attach);
</script>

<template>
  <div>
    <div
      ref="dropEl"
      class="cursor-pointer rounded-md border-2 border-dashed border-ink-700 bg-ink-850 px-4 py-6 text-center transition-colors hover:border-accent"
      :class="{ 'border-accent bg-ink-800': isOver }"
      @click="fileInput?.click()"
    >
      <p class="text-sm text-ink-200">
        <strong>GPX-Datei</strong> hier ablegen oder klicken zum Auswählen
      </p>
      <p v-if="gpx.fileName" class="mt-2 text-xs text-accent">
        Geladen: {{ gpx.fileName }}
      </p>
      <p v-else class="mt-1 text-xs text-ink-400">.gpx aus Komoot, Strava, etc.</p>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept=".gpx,application/gpx+xml,application/xml,text/xml"
      class="hidden"
      @change="onSelect"
    />
    <p v-if="gpx.error" class="mt-2 text-sm text-red-400">{{ gpx.error }}</p>
    <p v-if="gpx.parsing" class="mt-2 text-sm text-ink-300">Lese GPX …</p>
  </div>
</template>
