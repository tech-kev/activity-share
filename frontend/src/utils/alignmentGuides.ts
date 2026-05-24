// Snap-to-Alignment-Guides: berechnet den optimalen Versatz, damit eine Edge
// oder die Mitte eines Elements an Canvas-Kanten/-Mitte oder an Edges anderer
// Elemente snappt. Liefert die Snap-Positionen für die Anzeige der Hilfslinien.

import type { CanvasElement } from '@/types';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapResult {
  /** Snap-justierte Position (x/y). w/h bleiben unverändert. */
  x: number;
  y: number;
  /** Aktive vertikale Linien (Canvas-normalized x in 0..1). */
  guidesX: number[];
  /** Aktive horizontale Linien (Canvas-normalized y in 0..1). */
  guidesY: number[];
}

export interface SnapOptions {
  /** Schwellwert in Canvas-Normalized-Koordinaten (z.B. 6 / canvasWidth). */
  thresholdX: number;
  thresholdY: number;
  /** Andere Elemente, gegen deren Edges gesnappt werden soll. */
  others: CanvasElement[];
}

/**
 * Snap eines Bewegungs-Boxes gegen Canvas (0, 0.5, 1) und gegen die Edges
 * der anderen Elemente. Liefert die korrigierten Koordinaten + Liste der
 * aktiven Hilfslinien (Canvas-Koordinaten 0..1).
 */
export function snapBoxMove(box: Box, opts: SnapOptions): SnapResult {
  const dxs = [box.x, box.x + box.w / 2, box.x + box.w];
  const dys = [box.y, box.y + box.h / 2, box.y + box.h];

  const refXs: number[] = [0, 0.5, 1];
  const refYs: number[] = [0, 0.5, 1];
  for (const e of opts.others) {
    if (!e.visible) continue;
    refXs.push(e.x, e.x + e.w / 2, e.x + e.w);
    refYs.push(e.y, e.y + e.h / 2, e.y + e.h);
  }

  // Minimaler Versatz finden — über alle (draggedEdge, referenceEdge)-Kombis.
  let bestDx = 0;
  let bestDxAbs = Infinity;
  let bestRefX: number | null = null;
  for (const dx of dxs) {
    for (const rx of refXs) {
      const delta = rx - dx;
      const abs = Math.abs(delta);
      if (abs < opts.thresholdX && abs < bestDxAbs) {
        bestDxAbs = abs;
        bestDx = delta;
        bestRefX = rx;
      }
    }
  }

  let bestDy = 0;
  let bestDyAbs = Infinity;
  let bestRefY: number | null = null;
  for (const dy of dys) {
    for (const ry of refYs) {
      const delta = ry - dy;
      const abs = Math.abs(delta);
      if (abs < opts.thresholdY && abs < bestDyAbs) {
        bestDyAbs = abs;
        bestDy = delta;
        bestRefY = ry;
      }
    }
  }

  const snappedX = box.x + bestDx;
  const snappedY = box.y + bestDy;

  // Alle Edges, die nach dem Snap "auf der Linie" liegen, ausgeben (für
  // visuelle Anzeige — typischerweise sind das 1-2 Linien pro Achse).
  const guidesX: number[] = [];
  const guidesY: number[] = [];
  const snappedDxs = [snappedX, snappedX + box.w / 2, snappedX + box.w];
  const snappedDys = [snappedY, snappedY + box.h / 2, snappedY + box.h];
  if (bestRefX !== null) {
    for (const dx of snappedDxs) {
      if (Math.abs(dx - bestRefX) < 1e-6) {
        if (!guidesX.includes(bestRefX)) guidesX.push(bestRefX);
      }
    }
  }
  if (bestRefY !== null) {
    for (const dy of snappedDys) {
      if (Math.abs(dy - bestRefY) < 1e-6) {
        if (!guidesY.includes(bestRefY)) guidesY.push(bestRefY);
      }
    }
  }

  return { x: snappedX, y: snappedY, guidesX, guidesY };
}
