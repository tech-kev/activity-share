import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/views/SetupView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'editor',
    component: () => import('@/views/EditorView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // Bei jeder Navigation Status frisch holen. Damit greift z.B. ein gelöschter
  // User (DB manuell bearbeitet) → automatischer Redirect auf Setup-Screen.
  // Beim allerersten Aufruf läuft fetchStatus bereits via App.vue, kommt aber
  // ggf. erst nach beforeEach. Falls Status noch lädt, abwarten.
  if (auth.loading) {
    await auth.fetchStatus();
  } else {
    // Fire-and-forget revalidation für schnelle Navigation; wir warten nur, wenn
    // wir die Info zwingend brauchen (alle nicht-public Routen).
    await auth.fetchStatus();
  }

  if (!auth.setupComplete && to.name !== 'setup') {
    return { name: 'setup' };
  }
  if (auth.setupComplete && to.name === 'setup') {
    return { name: 'login' };
  }
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'editor' };
  }
});
