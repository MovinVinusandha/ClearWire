<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';

  function handleClose() {
    try {
      getCurrentWindow().close();
    } catch {
      // In web preview fallback
    }
  }
</script>

<span class="inline-flex items-center ml-1">
  <button class="wb close" title="Close" type="button" on:click={handleClose}>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <path d="m1.800 1.800 6.400 6.400m0-6.400-6.400 6.400" />
    </svg>
  </button>
</span>
