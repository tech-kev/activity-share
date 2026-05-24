import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { createUndoRedoPlugin } from './composables/useUndoRedo';
import './assets/styles.css';

const pinia = createPinia();
pinia.use(createUndoRedoPlugin({ stores: ['editor'] }));

const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount('#app');
