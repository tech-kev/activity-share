<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const password = ref('');
const busy = ref(false);

async function submit() {
  if (!password.value) return;
  busy.value = true;
  const ok = await auth.login(password.value);
  busy.value = false;
  if (ok) router.push({ name: 'editor' });
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-6">
    <div class="w-full max-w-sm card">
      <h1 class="mb-6 text-center font-display text-3xl tracking-wide">Activity Share</h1>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label for="pw" class="label">Passwort</label>
          <input
            id="pw"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="input"
            autofocus
          />
        </div>
        <p v-if="auth.error" class="text-sm text-red-400">{{ auth.error }}</p>
        <button type="submit" class="btn-primary w-full" :disabled="busy">
          {{ busy ? 'Anmelden …' : 'Anmelden' }}
        </button>
      </form>
    </div>
  </div>
</template>
