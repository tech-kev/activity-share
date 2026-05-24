<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

onMounted(async () => {
  await auth.fetchStatus();
});
</script>

<template>
  <RouterView v-if="!auth.loading" />
  <div v-else class="flex h-screen items-center justify-center text-ink-300">Lade …</div>
</template>
