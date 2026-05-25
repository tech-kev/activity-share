<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useEditorStore } from '@/stores/editor';
import { useGpxStore } from '@/stores/gpx';
import { useSettingsStore } from '@/stores/settings';
import { FORMAT_SIZES, type ImageFormat } from '@/types';
import { ref } from 'vue';
import GpxDropzone from './GpxDropzone.vue';
import PhotoDropzone from './PhotoDropzone.vue';
import StatsEditor from './StatsEditor.vue';
import ElementsList from './ElementsList.vue';
import ImageFilterPanel from './ImageFilterPanel.vue';
import DefaultPhotosPicker from './DefaultPhotosPicker.vue';
import KomootImportModal from './KomootImportModal.vue';

const komootOpen = ref(false);

const editor = useEditorStore();
const gpx = useGpxStore();
const settings = useSettingsStore();

const formats = Object.entries(FORMAT_SIZES) as [ImageFormat, (typeof FORMAT_SIZES)[ImageFormat]][];

const activities = computed(() => settings.values.activities ?? []);
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-4 space-y-5 text-sm">
    <section class="space-y-2">
      <GpxDropzone />
      <button
        type="button"
        class="btn-secondary w-full !justify-center"
        @click="komootOpen = true"
      >
        Aus Komoot importieren
      </button>
    </section>
    <section class="space-y-2">
      <PhotoDropzone />
    </section>
    <section><DefaultPhotosPicker /></section>

    <section class="space-y-2">
      <label class="label" for="title">Titel</label>
      <input
        id="title"
        class="input"
        :value="editor.title"
        @input="(e) => editor.setTitle((e.target as HTMLInputElement).value)"
        placeholder="z.B. Sonntagstour"
      />
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="label !mb-0" for="activity">Aktivität</label>
        <RouterLink to="/settings" class="text-xs text-ink-400 hover:text-ink-200">
          Bearbeiten …
        </RouterLink>
      </div>
      <select
        id="activity"
        class="input"
        :value="editor.activity"
        @change="(e) => editor.setActivity((e.target as HTMLSelectElement).value)"
      >
        <option v-for="a in activities" :key="a" :value="a">{{ a }}</option>
        <option v-if="!activities.includes(editor.activity) && editor.activity" :value="editor.activity">
          {{ editor.activity }}
        </option>
      </select>
    </section>

    <section class="space-y-2">
      <label class="label">Format</label>
      <div class="flex gap-2">
        <button
          v-for="[key, fs] in formats"
          :key="key"
          type="button"
          class="btn-secondary flex-1"
          :class="editor.format === key ? '!bg-accent !text-white' : ''"
          @click="editor.setFormat(key)"
        >
          {{ fs.label }}
        </button>
      </div>
    </section>

    <section class="space-y-2">
      <label class="flex items-center gap-2 text-xs text-ink-300">
        <input
          type="checkbox"
          class="accent-accent"
          :checked="editor.gridEnabled"
          @change="(e) => editor.setGridEnabled((e.target as HTMLInputElement).checked)"
        />
        <span>Raster anzeigen (Snap auf 8px)</span>
      </label>
    </section>

    <ElementsList />
    <ImageFilterPanel v-if="editor.photo.originalUrl" />
    <StatsEditor v-if="gpx.stats" />

    <KomootImportModal v-if="komootOpen" @close="komootOpen = false" />
  </div>
</template>
