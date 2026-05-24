import { onBeforeUnmount, onMounted } from 'vue';
import { useEditorStore } from '@/stores/editor';
import { FORMAT_SIZES } from '@/types';

/**
 * Bindet Pfeiltasten an die Bewegung des aktuell selektierten Elements.
 * - Pfeiltaste: 1px (relativ zur Vollauflösung des aktuellen Formats)
 * - Shift+Pfeiltaste: 10px
 * Reagiert nur, wenn kein Input/Textarea/Select fokussiert ist.
 */
export function useKeyboardNudge() {
  const editor = useEditorStore();

  function onKey(e: KeyboardEvent) {
    if (!editor.selectedElement) return;
    if (!/^Arrow(Up|Down|Left|Right)$/.test(e.key)) return;
    const t = document.activeElement;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();

    const step = e.shiftKey ? 10 : 1;
    const fs = FORMAT_SIZES[editor.format];
    const dx = step / fs.width;
    const dy = step / fs.height;
    switch (e.key) {
      case 'ArrowUp':
        editor.moveElement(editor.selectedElement, 0, -dy);
        break;
      case 'ArrowDown':
        editor.moveElement(editor.selectedElement, 0, dy);
        break;
      case 'ArrowLeft':
        editor.moveElement(editor.selectedElement, -dx, 0);
        break;
      case 'ArrowRight':
        editor.moveElement(editor.selectedElement, dx, 0);
        break;
    }
  }

  onMounted(() => window.addEventListener('keydown', onKey));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
}
