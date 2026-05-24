import { ref, watch, type Ref } from 'vue';

/**
 * Lädt ein HTMLImageElement aus einer URL und stellt es als Ref bereit.
 * Reagiert reaktiv auf URL-Änderungen. Gibt `null` zurück, solange das Bild
 * (neu) lädt oder die URL leer ist.
 */
export function useImage(source: Ref<string | null | undefined>) {
  const image = ref<HTMLImageElement | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  watch(
    source,
    (url) => {
      if (!url) {
        image.value = null;
        loading.value = false;
        error.value = null;
        return;
      }
      loading.value = true;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        image.value = img;
        loading.value = false;
      };
      img.onerror = () => {
        error.value = 'Bild konnte nicht geladen werden';
        loading.value = false;
      };
      img.src = url;
    },
    { immediate: true },
  );

  return { image, loading, error };
}
