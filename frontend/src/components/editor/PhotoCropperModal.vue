<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Cropper, type CropperResult } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import { FORMAT_SIZES } from '@/types';
import { useEditorStore } from '@/stores/editor';

const emit = defineEmits<{ (e: 'close'): void }>();
const editor = useEditorStore();

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null);
const busy = ref(false);

const aspect = computed(() => {
  const fs = FORMAT_SIZES[editor.format];
  return fs.width / fs.height;
});

async function applyCrop() {
  if (!cropperRef.value) return;
  busy.value = true;
  const result = cropperRef.value.getResult() as CropperResult;
  if (!result?.canvas) {
    busy.value = false;
    return;
  }
  result.canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      editor.setPhotoCropped(url);
    }
    busy.value = false;
    emit('close');
  }, 'image/jpeg', 0.92);
}

function close() {
  emit('close');
}

// Esc schließt das Modal
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}
import { onBeforeUnmount, onMounted } from 'vue';
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

// Falls Format gewechselt wird, während Cropper offen ist → automatisches Update
watch(aspect, () => {
  // Cropper aktualisiert sich über stencil-props automatisch
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" @click.self="close">
    <div class="card flex max-h-[90vh] w-full max-w-4xl flex-col gap-3">
      <header class="flex items-center justify-between border-b border-ink-800 pb-2">
        <h2 class="font-display text-xl tracking-wide">Foto zuschneiden</h2>
        <button class="btn-ghost" @click="close">✕</button>
      </header>
      <div class="flex-1 overflow-hidden bg-ink-950">
        <Cropper
          v-if="editor.photo.originalUrl"
          ref="cropperRef"
          :src="editor.photo.originalUrl"
          class="h-[60vh]"
          :stencil-props="{ aspectRatio: aspect }"
          image-restriction="fit-area"
        />
      </div>
      <footer class="flex items-center justify-end gap-2 border-t border-ink-800 pt-2">
        <button class="btn-secondary" @click="close" :disabled="busy">Abbrechen</button>
        <button class="btn-primary" @click="applyCrop" :disabled="busy">
          {{ busy ? 'Wende an …' : 'Übernehmen' }}
        </button>
      </footer>
    </div>
  </div>
</template>
