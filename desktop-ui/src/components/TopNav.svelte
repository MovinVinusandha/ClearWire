<script lang="ts">
  import WindowControls from './WindowControls.svelte';

  export let title: string = 'All activity';
  export let theme: 'light' | 'dark' = 'dark';
  export let showSummaryToggle: boolean = false;
  export let onToggleTheme: () => void;
  export let onToggleSummary: () => void;
</script>

<header class="flex items-center gap-1.5 h-[46px] px-3 bg-side border-b border-line shrink-0 select-none">
  <!-- Title / Breadcrumb with shield icon -->
  <div class="flex-1 min-w-0 flex items-center gap-2">
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--down)" stroke-width="1.5" class="shrink-0">
      <path d="M8 1.500 13.500 4v4c0 3-2.300 5.300-5.500 6.500C4.800 13.300 2.500 11 2.500 8V4z" />
    </svg>
    <span class="font-bold text-[13px] truncate text-tx">
      {title}
    </span>
  </div>

  <!-- Theme Toggle -->
  <button
    class="hb"
    title="Switch light/dark theme (current: {theme})"
    type="button"
    on:click={onToggleTheme}
  >
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
      <circle cx="8" cy="8" r="5.500" />
      <path d="M8 2.500a5.500 5.500 0 0 1 0 11z" fill="currentColor" />
    </svg>
  </button>

  <!-- Summary Drawer Toggle (when in mid-width mode) -->
  {#if showSummaryToggle}
    <button
      class="hb sumbtn"
      title="Toggle Summary"
      type="button"
      on:click={onToggleSummary}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <rect x="2" y="3" width="12" height="10" rx="2" />
        <path d="M10 3v10" />
      </svg>
    </button>
  {/if}

  <WindowControls />
</header>
