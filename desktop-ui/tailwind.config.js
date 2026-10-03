/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        side: 'var(--side)',
        line: 'var(--line)',
        tx: 'var(--tx)',
        mute: 'var(--mute)',
        hov: 'var(--hov)',
        sel: 'var(--sel)',
        up: 'var(--up)',
        down: 'var(--down)',
        ok: 'var(--ok)',
        no: 'var(--no)',
        warn: 'var(--warn)',
      },
    },
  },
  plugins: [],
}
