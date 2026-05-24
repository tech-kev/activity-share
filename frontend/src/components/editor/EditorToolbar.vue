<script setup lang="ts">
import { useEditorStore, EDITOR_DEFAULT_LAYOUT } from '@/stores/editor';
import { useSettingsStore } from '@/stores/settings';
import { canRedo, canUndo, clearHistory, redo, undo } from '@/composables/useUndoRedo';

const editor = useEditorStore();
const settings = useSettingsStore();

function onUndo() {
  undo(editor);
}
function onRedo() {
  redo(editor);
}
function onReset() {
  editor.resetLayout(settings.values.defaultLayout ?? EDITOR_DEFAULT_LAYOUT);
  clearHistory(editor);
}

defineProps<{ onExport?: () => void; onShare?: () => void }>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 border-b border-ink-800 bg-ink-900 px-2 py-2 sm:gap-2 sm:px-4">
    <button class="btn-ghost !px-2 sm:!px-3" :disabled="!canUndo(editor)" @click="onUndo" title="Rückgängig (Ctrl+Z)">
      ↶<span class="ml-1 hidden sm:inline">Rückgängig</span>
    </button>
    <button class="btn-ghost !px-2 sm:!px-3" :disabled="!canRedo(editor)" @click="onRedo" title="Wiederholen (Ctrl+Shift+Z)">
      ↷<span class="ml-1 hidden sm:inline">Wiederholen</span>
    </button>
    <button class="btn-secondary !px-2 sm:!px-3" @click="onReset" title="Layout auf Defaults zurücksetzen">Reset</button>
    <span class="mx-1 hidden text-ink-500 sm:inline">|</span>
    <slot />
  </div>
</template>
