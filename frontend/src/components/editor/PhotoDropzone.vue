<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useEditorStore } from '@/stores/editor';
import { useDropzone } from '@/composables/useDropzone';

const editor = useEditorStore();
const dropEl = ref<HTMLDivElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

async function handleFile(file: File) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    editor.setPhotoOriginal(url, file.name, { width: img.naturalWidth, height: img.naturalHeight });
  };
  img.src = url;
}

const { isOver, attach } = useDropzone(dropEl, {
  accept: ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'],
  onDrop: handleFile,
});

onMounted(attach);

function onSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) handleFile(file);
  input.value = '';
}
</script>

<template>
  <div>
    <div
      ref="dropEl"
      class="cursor-pointer rounded-md border-2 border-dashed border-ink-700 bg-ink-850 px-4 py-6 text-center transition-colors hover:border-accent"
      :class="{ 'border-accent bg-ink-800': isOver }"
      @click="fileInput?.click()"
    >
      <p class="text-sm text-ink-200"><strong>Foto</strong> ablegen oder klicken</p>
      <p v-if="editor.photo.fileName" class="mt-2 text-xs text-accent">
        {{ editor.photo.fileName }}
      </p>
      <p v-else class="mt-1 text-xs text-ink-400">JPG / PNG / WebP</p>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onSelect"
    />
  </div>
</template>
