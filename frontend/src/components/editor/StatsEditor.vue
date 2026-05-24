<script setup lang="ts">
import { useGpxStore } from '@/stores/gpx';
import { useEditorStore } from '@/stores/editor';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatMeters,
  formatPace,
  formatSpeed,
} from '@/utils/gpxParser';
import type { StatKey } from '@/types';

const gpx = useGpxStore();
const editor = useEditorStore();

interface StatRow {
  key: StatKey;
  label: string;
  formattedDefault: string;
}

function rows(): StatRow[] {
  const g = gpx.stats;
  if (!g) return [];
  return [
    { key: 'distance', label: 'Distanz', formattedDefault: formatDistance(g.distance) },
    { key: 'duration', label: 'Dauer (gesamt)', formattedDefault: formatDuration(g.duration) },
    { key: 'movingDuration', label: 'Dauer (Bewegung)', formattedDefault: formatDuration(g.movingDuration) },
    { key: 'elevationGain', label: 'HM aufwärts', formattedDefault: formatMeters(g.elevationGain) },
    { key: 'elevationLoss', label: 'HM abwärts', formattedDefault: formatMeters(g.elevationLoss) },
    { key: 'elevationMax', label: 'Max. Höhe', formattedDefault: formatMeters(g.elevationMax) },
    { key: 'avgSpeed', label: 'Ø Tempo', formattedDefault: formatSpeed(g.avgSpeed) },
    { key: 'maxSpeed', label: 'Max. Tempo', formattedDefault: formatSpeed(g.maxSpeed) },
    { key: 'avgPace', label: 'Ø Pace', formattedDefault: formatPace(g.avgPaceSecPerKm) },
    { key: 'startDate', label: 'Datum', formattedDefault: formatDate(g.startTime) },
  ];
}

function toggleStat(key: StatKey, checked: boolean) {
  if (checked) editor.addStat(key);
  else editor.removeStat(key);
}

function isSelected(key: StatKey): boolean {
  return editor.elements[`stat:${key}`]?.visible ?? false;
}

function onOverride(key: StatKey, value: string) {
  gpx.setOverride(key, value || null);
}
</script>

<template>
  <div v-if="gpx.stats" class="space-y-2">
    <p class="label">Stats</p>
    <div class="max-h-72 space-y-2 overflow-y-auto">
      <div
        v-for="row in rows()"
        :key="row.key"
        class="flex items-center gap-2 rounded-md border border-ink-800 bg-ink-850 p-2"
      >
        <label class="flex flex-1 items-center gap-2 text-xs">
          <input
            type="checkbox"
            class="accent-accent"
            :checked="isSelected(row.key)"
            @change="(e) => toggleStat(row.key, (e.target as HTMLInputElement).checked)"
          />
          <span class="font-medium">{{ row.label }}</span>
        </label>
        <input
          class="w-32 rounded border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-100 placeholder:text-ink-500"
          :placeholder="row.formattedDefault"
          :value="gpx.overrides[row.key] ?? ''"
          @input="(e) => onOverride(row.key, (e.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
  <p v-else class="text-xs text-ink-400">Lade eine GPX-Datei, um Stats zu sehen.</p>
</template>
