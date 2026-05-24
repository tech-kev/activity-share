<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { FORMAT_SIZES, type ElementId } from '@/types';
import { useEditorStore } from '@/stores/editor';
import { useGpxStore } from '@/stores/gpx';
import { useSettingsStore } from '@/stores/settings';
import { renderToCanvas } from '@/utils/renderer';
import { snapBoxMove } from '@/utils/alignmentGuides';
import { useImage } from '@/composables/useImage';

const editor = useEditorStore();
const gpx = useGpxStore();
const settings = useSettingsStore();

const photoSrc = computed(() => editor.photo.croppedUrl ?? editor.photo.originalUrl);
const logoSrc = computed(() => settings.values.logoPath);
const { image: photoImg } = useImage(photoSrc);
const { image: logoImg } = useImage(logoSrc);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

const formatSize = computed(() => FORMAT_SIZES[editor.format]);
const PREVIEW_MAX = 1200;
const previewSize = computed(() => {
  const fs = formatSize.value;
  const scale = Math.min(1, PREVIEW_MAX / Math.max(fs.width, fs.height));
  return { width: Math.round(fs.width * scale), height: Math.round(fs.height * scale) };
});

function render() {
  if (!canvasRef.value) return;
  renderToCanvas(
    canvasRef.value,
    {
      format: editor.format,
      title: editor.title,
      activity: editor.activity,
      stats: editor.stats,
      gpx: gpx.stats,
      overrides: gpx.overrides,
      photo: photoImg.value,
      logo: logoImg.value,
      elements: editor.elements,
      settings: settings.values,
      imageFilter: editor.imageFilter,
    },
    previewSize.value,
  );
}

onMounted(() => {
  render();
  // Webfonts können verzögert laden — sobald ready, neu rendern (Canvas-Text passt sich an).
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => render());
  }
});

watch(
  () => [
    editor.format,
    editor.title,
    editor.activity,
    editor.stats,
    editor.elements,
    editor.imageFilter,
    photoImg.value,
    logoImg.value,
    gpx.stats,
    gpx.overrides,
    settings.values,
  ],
  render,
  { deep: true },
);

// --- Drag & Resize ---
type Mode = 'move' | 'nw' | 'ne' | 'sw' | 'se';
interface ActionState {
  id: ElementId;
  mode: Mode;
  startX: number;
  startY: number;
  startBox: { x: number; y: number; w: number; h: number };
}
const action = ref<ActionState | null>(null);
const guides = ref<{ x: number[]; y: number[] }>({ x: [], y: [] });

function hitTest(localX: number, localY: number): ElementId | null {
  const fs = previewSize.value;
  const nx = localX / fs.width;
  const ny = localY / fs.height;
  const ordered = Object.values(editor.elements)
    .filter((el) => el.visible && !el.locked && el.id !== 'photo' && el.id !== 'gradient')
    .sort((a, b) => b.zIndex - a.zIndex);
  for (const el of ordered) {
    if (nx >= el.x && nx <= el.x + el.w && ny >= el.y && ny <= el.y + el.h) {
      return el.id;
    }
  }
  return null;
}

function getCanvasCoords(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function onPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement;
  // Wenn auf Resize-Handle geklickt wurde, übernimmt onHandleDown
  if (target?.dataset?.handle) return;

  const { x, y } = getCanvasCoords(e);
  const id = hitTest(x, y);
  if (!id) {
    editor.selectElement(null);
    return;
  }
  editor.selectElement(id);
  const el = editor.elements[id];
  canvasRef.value!.setPointerCapture(e.pointerId);
  action.value = {
    id,
    mode: 'move',
    startX: x,
    startY: y,
    startBox: { x: el.x, y: el.y, w: el.w, h: el.h },
  };
}

function onHandleDown(e: PointerEvent, mode: 'nw' | 'ne' | 'sw' | 'se') {
  e.stopPropagation();
  const id = editor.selectedElement;
  if (!id) return;
  const el = editor.elements[id];
  if (!el || el.locked) return;
  const { x, y } = getCanvasCoords(e);
  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  action.value = {
    id,
    mode,
    startX: x,
    startY: y,
    startBox: { x: el.x, y: el.y, w: el.w, h: el.h },
  };
}

function snapStep(): { sx: number; sy: number } {
  const fs = FORMAT_SIZES[editor.format];
  return { sx: 8 / fs.width, sy: 8 / fs.height };
}

function snapValue(v: number, step: number): number {
  return editor.gridEnabled ? Math.round(v / step) * step : v;
}

function onPointerMove(e: PointerEvent) {
  if (!action.value) return;
  const { x, y } = getCanvasCoords(e);
  const fs = previewSize.value;
  const dxNorm = (x - action.value.startX) / fs.width;
  const dyNorm = (y - action.value.startY) / fs.height;
  const { sx, sy } = snapStep();
  const start = action.value.startBox;

  if (action.value.mode === 'move') {
    // 1. Grid-Snap (falls aktiv)
    let nx = snapValue(start.x + dxNorm, sx);
    let ny = snapValue(start.y + dyNorm, sy);
    // 2. Alignment-Guides berechnen und ggf. snappen (überschreibt Grid bei
    // genauem Treffer, wirkt aber innerhalb eines kleinen Toleranzbereichs).
    const others = Object.values(editor.elements).filter((e) => e.id !== action.value!.id);
    const previewW = previewSize.value.width;
    const previewH = previewSize.value.height;
    const TH = 6 / previewW;
    const TV = 6 / previewH;
    const snap = snapBoxMove(
      { x: nx, y: ny, w: start.w, h: start.h },
      { thresholdX: TH, thresholdY: TV, others },
    );
    guides.value = { x: snap.guidesX, y: snap.guidesY };
    editor.setElementPosition(action.value.id, snap.x, snap.y);
    return;
  }

  let nx = start.x;
  let ny = start.y;
  let nw = start.w;
  let nh = start.h;

  const m = action.value.mode;
  if (m === 'nw') {
    nx = snapValue(start.x + dxNorm, sx);
    ny = snapValue(start.y + dyNorm, sy);
    nw = start.w - (nx - start.x);
    nh = start.h - (ny - start.y);
  } else if (m === 'ne') {
    ny = snapValue(start.y + dyNorm, sy);
    nw = snapValue(start.w + dxNorm, sx);
    nh = start.h - (ny - start.y);
  } else if (m === 'sw') {
    nx = snapValue(start.x + dxNorm, sx);
    nw = start.w - (nx - start.x);
    nh = snapValue(start.h + dyNorm, sy);
  } else if (m === 'se') {
    nw = snapValue(start.w + dxNorm, sx);
    nh = snapValue(start.h + dyNorm, sy);
  }

  // Aspect-Lock mit Shift: halte das Ursprungs-Seitenverhältnis bei.
  // Die dominantere Änderung gewinnt; die andere Achse wird proportional gesetzt.
  // Bei NW/NE/SW wird zusätzlich x/y nachgezogen, damit die gegenüberliegende
  // Ecke fix bleibt.
  if (e.shiftKey) {
    const aspect = start.w / Math.max(start.h, 1e-6);
    const dwRel = Math.abs(nw / start.w - 1);
    const dhRel = Math.abs(nh / start.h - 1);
    if (dwRel >= dhRel) {
      nh = nw / aspect;
    } else {
      nw = nh * aspect;
    }
    if (m === 'nw') {
      nx = start.x + start.w - nw;
      ny = start.y + start.h - nh;
    } else if (m === 'ne') {
      ny = start.y + start.h - nh;
    } else if (m === 'sw') {
      nx = start.x + start.w - nw;
    }
  }

  editor.setElementBox(action.value.id, { x: nx, y: ny, w: nw, h: nh });
}

function onPointerUp() {
  action.value = null;
  guides.value = { x: [], y: [] };
}

function onResize() {
  // bei Container-Resize: einfach neu rendern (Canvas-CSS-Größe folgt aspect-ratio)
  render();
}

let ro: ResizeObserver | null = null;
onMounted(() => {
  if (containerRef.value) {
    ro = new ResizeObserver(() => onResize());
    ro.observe(containerRef.value);
  }
});
onBeforeUnmount(() => ro?.disconnect());

const selectionStyle = computed(() => {
  if (!editor.selectedElement) return null;
  const el = editor.elements[editor.selectedElement];
  if (!el || !el.visible) return null;
  return {
    left: el.x * 100 + '%',
    top: el.y * 100 + '%',
    width: el.w * 100 + '%',
    height: el.h * 100 + '%',
  };
});

const showHandles = computed(() => {
  if (!editor.selectedElement) return false;
  const el = editor.elements[editor.selectedElement];
  return !!el && el.visible && !el.locked;
});

defineExpose({ render, canvasRef, formatSize });
</script>

<template>
  <div
    ref="containerRef"
    class="relative mx-auto flex max-h-full max-w-full items-center justify-center"
    :style="{ aspectRatio: `${formatSize.width} / ${formatSize.height}` }"
  >
    <canvas
      ref="canvasRef"
      class="block max-h-full max-w-full select-none rounded-md shadow-2xl"
      :class="{ 'cursor-grabbing': action?.mode === 'move', 'cursor-crosshair': !action }"
      :style="{ aspectRatio: `${formatSize.width} / ${formatSize.height}` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
    <div
      v-if="editor.gridEnabled"
      class="pointer-events-none absolute inset-0 rounded-md"
      :style="{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '8% 8%',
      }"
    />
    <!-- Alignment Guides während Drag -->
    <div
      v-for="(gx, idx) in guides.x"
      :key="`gx-${idx}`"
      class="pointer-events-none absolute top-0 bottom-0 w-px bg-accent shadow-[0_0_4px_rgba(249,115,22,0.7)]"
      :style="{ left: gx * 100 + '%' }"
    />
    <div
      v-for="(gy, idx) in guides.y"
      :key="`gy-${idx}`"
      class="pointer-events-none absolute left-0 right-0 h-px bg-accent shadow-[0_0_4px_rgba(249,115,22,0.7)]"
      :style="{ top: gy * 100 + '%' }"
    />
    <div
      v-if="selectionStyle"
      class="pointer-events-none absolute rounded-sm border-2 border-accent"
      :style="selectionStyle"
    >
      <template v-if="showHandles">
        <span
          data-handle="nw"
          class="pointer-events-auto absolute -left-1.5 -top-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-accent"
          @pointerdown="(e) => onHandleDown(e, 'nw')"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
        />
        <span
          data-handle="ne"
          class="pointer-events-auto absolute -right-1.5 -top-1.5 h-3 w-3 cursor-nesw-resize rounded-sm border border-white bg-accent"
          @pointerdown="(e) => onHandleDown(e, 'ne')"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
        />
        <span
          data-handle="sw"
          class="pointer-events-auto absolute -bottom-1.5 -left-1.5 h-3 w-3 cursor-nesw-resize rounded-sm border border-white bg-accent"
          @pointerdown="(e) => onHandleDown(e, 'sw')"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
        />
        <span
          data-handle="se"
          class="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-accent"
          @pointerdown="(e) => onHandleDown(e, 'se')"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
        />
      </template>
    </div>
  </div>
</template>
