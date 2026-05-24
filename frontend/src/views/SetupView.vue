<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const password = ref('');
const repeat = ref('');
const busy = ref(false);

const mismatch = computed(() => password.value.length > 0 && password.value !== repeat.value);
const tooShort = computed(() => password.value.length > 0 && password.value.length < 8);

async function submit() {
  if (mismatch.value || tooShort.value || !password.value) return;
  busy.value = true;
  const ok = await auth.setup(password.value);
  busy.value = false;
  if (ok) router.push({ name: 'editor' });
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-6">
    <div class="w-full max-w-md card">
      <h1 class="mb-2 text-center font-display text-3xl tracking-wide">Willkommen bei Activity Share</h1>
      <p class="mb-6 text-center text-sm text-ink-300">
        Lege ein Passwort für deinen Account fest. Du kannst es später in den Einstellungen ändern.
      </p>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label for="pw" class="label">Neues Passwort (min. 8 Zeichen)</label>
          <input id="pw" v-model="password" type="password" autocomplete="new-password" class="input" />
        </div>
        <div>
          <label for="pw2" class="label">Passwort wiederholen</label>
          <input id="pw2" v-model="repeat" type="password" autocomplete="new-password" class="input" />
        </div>
        <p v-if="tooShort" class="text-sm text-red-400">Mindestens 8 Zeichen.</p>
        <p v-else-if="mismatch" class="text-sm text-red-400">Passwörter stimmen nicht überein.</p>
        <p v-else-if="auth.error" class="text-sm text-red-400">{{ auth.error }}</p>
        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="busy || mismatch || tooShort || !password"
        >
          {{ busy ? 'Lege an …' : 'Passwort speichern' }}
        </button>
      </form>
    </div>
  </div>
</template>
