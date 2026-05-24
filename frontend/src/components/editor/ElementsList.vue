<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '@/stores/editor';
import { isStatElement, STAT_LABELS, type BuiltinElementId, type ElementId, type StatKey } from '@/types';

const editor = useEditorStore();

const builtinLabels: Record<BuiltinElementId, string> = {
  photo: 'Foto',
  gradient: 'Gradient',
  activity: 'Aktivität',
  title: 'Titel',
  route: 'Route-Outline',
  elevation: 'Höhenprofil',
  logo: 'Logo',
};

const builtinOrder: BuiltinElementId[] = [
  'photo',
  'gradient',
  'activity',
  'title',
  'route',
  'elevation',
  'logo',
];

interface Entry {
  id: ElementId;
  label: string;
}

const entries = computed<Entry[]>(() => {
  const out: Entry[] = builtinOrder.map((id) => ({ id, label: builtinLabels[id] }));
  for (const key of editor.stats) {
    out.push({ id: `stat:${key}`, label: `Stat: ${STAT_LABELS[key]}` });
  }
  return out;
});

function labelOf(id: ElementId): string {
  if (isStatElement(id)) {
    const key = id.slice(5) as StatKey;
    return `Stat: ${STAT_LABELS[key]}`;
  }
  return builtinLabels[id as BuiltinElementId];
}

void labelOf;
</script>

<template>
  <div class="space-y-1">
    <p class="label">Elemente</p>
    <div class="space-y-1">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="flex items-center justify-between rounded-md border border-transparent bg-ink-850 px-2 py-1 hover:bg-ink-800"
        :class="{
          'border-accent': editor.selectedElement === entry.id,
          'opacity-60': !editor.elements[entry.id]?.visible,
        }"
        @click="editor.selectElement(entry.id)"
      >
        <span class="flex-1 cursor-pointer text-sm">{{ entry.label }}</span>
        <button
          type="button"
          class="rounded p-1 text-ink-300 hover:bg-ink-700 hover:text-white"
          :title="editor.elements[entry.id]?.visible ? 'Ausblenden' : 'Einblenden'"
          @click.stop="editor.toggleVisibility(entry.id)"
        >
          <span v-if="editor.elements[entry.id]?.visible" aria-hidden>👁</span>
          <span v-else aria-hidden>🚫</span>
        </button>
        <button
          type="button"
          class="rounded p-1 text-ink-300 hover:bg-ink-700 hover:text-white"
          :title="editor.elements[entry.id]?.locked ? 'Entsperren' : 'Sperren'"
          @click.stop="editor.toggleLock(entry.id)"
        >
          <span v-if="editor.elements[entry.id]?.locked" aria-hidden>🔒</span>
          <span v-else aria-hidden>🔓</span>
        </button>
      </div>
    </div>
  </div>
</template>
