import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Target root container #app not found in document.');
}

const app = new App({
  target,
});

export default app;
