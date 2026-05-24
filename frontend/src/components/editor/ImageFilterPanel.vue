<script setup lang="ts">
import { useEditorStore } from '@/stores/editor';

const editor = useEditorStore();

function setFilter(key: 'brightness' | 'contrast' | 'saturation', value: number) {
  editor.setImageFilter({ [key]: value });
}

function reset() {
  editor.setImageFilter({ brightness: 1, contrast: 1, saturation: 1 });
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <p class="label !mb-0">Bild-Filter</p>
      <button class="text-xs text-ink-400 hover:text-ink-200" @click="reset">Zurücksetzen</button>
    </div>
    <div class="space-y-2">
      <div>
        <label class="flex items-center justify-between text-xs text-ink-300">
          <span>Helligkeit</span>
          <span>{{ editor.imageFilter.brightness.toFixed(2) }}</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.01"
          :value="editor.imageFilter.brightness"
          @input="(e) => setFilter('brightness', Number((e.target as HTMLInputElement).value))"
          class="w-full accent-accent"
        />
      </div>
      <div>
        <label class="flex items-center justify-between text-xs text-ink-300">
          <span>Kontrast</span>
          <span>{{ editor.imageFilter.contrast.toFixed(2) }}</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.01"
          :value="editor.imageFilter.contrast"
          @input="(e) => setFilter('contrast', Number((e.target as HTMLInputElement).value))"
          class="w-full accent-accent"
        />
      </div>
      <div>
        <label class="flex items-center justify-between text-xs text-ink-300">
          <span>Sättigung</span>
          <span>{{ editor.imageFilter.saturation.toFixed(2) }}</span>
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.01"
          :value="editor.imageFilter.saturation"
          @input="(e) => setFilter('saturation', Number((e.target as HTMLInputElement).value))"
          class="w-full accent-accent"
        />
      </div>
    </div>
  </div>
</template>
