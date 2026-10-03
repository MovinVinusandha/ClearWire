<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';

  async function handleMinimize() {
    try {
      await getCurrentWindow().minimize();
    } catch {
      // In web preview fallback
    }
  }

  async function handleMaximize() {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch {
      // In web preview fallback
    }
  }

  async function handleClose() {
    try {
      await getCurrentWindow().close();
    } catch {
      // In web preview fallback
    }
  }
</script>

<div class="inline-flex items-center gap-1.5 ml-1">
  <button class="wb" title="Minimize" type="button" on:click={handleMinimize}>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <path d="M2 5h6" />
    </svg>
  </button>
  <button class="wb" title="Maximize" type="button" on:click={handleMaximize}>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <rect x="2" y="2" width="6" height="6" rx="1" />
    </svg>
  </button>
  <button class="wb close" title="Close" type="button" on:click={handleClose}>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <path d="m1.800 1.800 6.400 6.400m0-6.400-6.400 6.400" />
    </svg>
  </button>
</div>

