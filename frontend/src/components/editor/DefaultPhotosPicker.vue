<script setup lang="ts">
import { onMounted } from 'vue';
import { useDefaultPhotosStore } from '@/stores/defaultPhotos';
import { useEditorStore } from '@/stores/editor';

const store = useDefaultPhotosStore();
const editor = useEditorStore();

onMounted(() => store.load());

function pick(url: string, name: string) {
  // Lokales <img> laden, Naturalsize bestimmen, dann als Default-Foto setzen.
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    editor.setPhotoOriginal(url, name, { width: img.naturalWidth, height: img.naturalHeight });
    store.select(url);
  };
  img.src = url;
}
</script>

<template>
  <div v-if="store.photos.length > 0" class="space-y-2">
    <p class="label">Default-Bilder</p>
    <p v-if="store.error" class="text-xs text-red-400">{{ store.error }}</p>
    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="p in store.photos"
        :key="p.url"
        type="button"
        class="group relative aspect-square overflow-hidden rounded-md border-2 transition-colors focus:outline-none"
        :class="store.selectedUrl === p.url ? 'border-accent' : 'border-ink-700 hover:border-ink-500'"
        :title="p.name"
        @click="pick(p.url, p.name)"
      >
        <img :src="p.url" alt="" class="h-full w-full object-cover" loading="lazy" />
        <span
          class="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          {{ p.name }}
        </span>
      </button>
    </div>
    <button
      v-if="store.photos.length > 0"
      type="button"
      class="text-xs text-ink-400 hover:text-ink-200"
      @click="store.load(true)"
    >
      Liste neu laden
    </button>
  </div>
</template>
