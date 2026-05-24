import { onBeforeUnmount, ref, type Ref } from 'vue';

interface DropzoneOptions {
  /** MIME-Typen oder Datei-Endungen (z.B. ['.gpx', 'application/gpx+xml']) */
  accept?: string[];
  /** Callback wenn eine gültige Datei abgelegt wird. */
  onDrop: (file: File) => void;
}

/**
 * Drag & Drop Composable. Bindet sich an einen Container und behandelt
 * dragenter/dragover/dragleave/drop. `isOver` zeigt an, ob gerade Dateien
 * über dem Container schweben (für visuelles Feedback).
 */
export function useDropzone(target: Ref<HTMLElement | null>, opts: DropzoneOptions) {
  const isOver = ref(false);
  let counter = 0;

  function matches(file: File): boolean {
    if (!opts.accept || opts.accept.length === 0) return true;
    const lowerName = file.name.toLowerCase();
    return opts.accept.some((rule) => {
      if (rule.startsWith('.')) return lowerName.endsWith(rule.toLowerCase());
      return file.type === rule;
    });
  }

  function onEnter(e: DragEvent) {
    e.preventDefault();
    counter++;
    isOver.value = true;
  }
  function onOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }
  function onLeave(e: DragEvent) {
    e.preventDefault();
    counter = Math.max(0, counter - 1);
    if (counter === 0) isOver.value = false;
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    counter = 0;
    isOver.value = false;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = Array.from(files).find(matches);
    if (file) opts.onDrop(file);
  }

  function attach() {
    const el = target.value;
    if (!el) return;
    el.addEventListener('dragenter', onEnter);
    el.addEventListener('dragover', onOver);
    el.addEventListener('dragleave', onLeave);
    el.addEventListener('drop', onDrop);
  }

  function detach() {
    const el = target.value;
    if (!el) return;
    el.removeEventListener('dragenter', onEnter);
    el.removeEventListener('dragover', onOver);
    el.removeEventListener('dragleave', onLeave);
    el.removeEventListener('drop', onDrop);
  }

  onBeforeUnmount(detach);

  return { isOver, attach, detach };
}
