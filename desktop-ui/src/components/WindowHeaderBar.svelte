<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import WindowControls from './WindowControls.svelte';

  export let title: string = 'All activity';
  export let theme: 'light' | 'dark' = 'dark';
  export let isCompact: boolean = false;
  export let showSummaryToggle: boolean = false;
  export let daemonConnected: boolean = false;
  export let onToggleTheme: () => void;
  export let onToggleSummary: () => void = () => {};
  export let onGlobalAction: (action: 'allow' | 'deny' | 'reset' | 'theme' | 'about') => void;

  let isMenuOpen = false;

  function handleMenuAction(action: 'allow' | 'deny' | 'reset' | 'theme' | 'about') {
    isMenuOpen = false;
    onGlobalAction(action);
  }

  async function handleHeaderMouseDown(e: MouseEvent) {
    if (e.button === 0 && !(e.target as HTMLElement)?.closest('button, input, select, textarea, [role="button"], .menu')) {
      try {
        await getCurrentWindow().startDragging();
      } catch {
        // Fallback for non-Tauri preview
      }
    }
  }
</script>

<svelte:window on:click={() => { isMenuOpen = false; }} />

<!-- svelte-ignore a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
<header
  class="flex items-center h-[46px] bg-side border-b border-line shrink-0 select-none relative z-40 cursor-default"
  data-tauri-drag-region
  role="region"
  aria-label="Window header"
  on:mousedown={handleHeaderMouseDown}
>
  {#if !isCompact}
    <!-- DESKTOP MODE: Left section matches sidebar width (w-72, 288px) with centered clearWire matching Image 1 -->
    <div
      class="w-72 shrink-0 h-full border-r border-line relative flex items-center px-2"
      data-tauri-drag-region
    >
      <div class="relative z-10">
        <button
          class="hb"
          title="Main menu"
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          on:click|stopPropagation={() => (isMenuOpen = !isMenuOpen)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M2.500 4h11M2.500 8h11M2.500 12h11" />
          </svg>
        </button>

        {#if isMenuOpen}
          <div class="menu" style="left: 0; right: auto;">
            <button class="mi" type="button" on:click={() => handleMenuAction('allow')}>
              Allow all connections
            </button>
            <button class="mi" type="button" on:click={() => handleMenuAction('deny')}>
              Block all connections
            </button>
            <button class="mi" type="button" on:click={() => handleMenuAction('reset')}>
              Reset rules
            </button>
            <hr class="my-1 border-line" />
            <button class="mi" type="button" on:click={() => handleMenuAction('theme')}>
              Toggle dark mode
            </button>
            <button class="mi" type="button" on:click={() => handleMenuAction('about')}>
              About clearWire
            </button>
          </div>
        {/if}
      </div>

      <!-- Centered clearWire brand title matching Image 1 -->
      <span class="absolute inset-x-0 text-center font-bold text-[13px] pointer-events-none text-tx">
        clearWire
      </span>
    </div>

    <!-- Center Section: Title & shield icon -->
    <div
      class="flex-1 min-w-0 flex items-center gap-2 px-3"
      data-tauri-drag-region
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--down)" stroke-width="1.5" class="shrink-0 pointer-events-none">
        <path d="M8 1.500 13.500 4v4c0 3-2.300 5.300-5.500 6.500C4.800 13.300 2.500 11 2.500 8V4z" />
      </svg>
      <span class="font-bold text-[13px] truncate text-tx pointer-events-none">
        {title}
      </span>
      <div
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border pointer-events-auto"
        style={daemonConnected
          ? 'background: rgba(46, 213, 115, 0.12); border-color: rgba(46, 213, 115, 0.35); color: var(--ok);'
          : 'background: rgba(255, 171, 0, 0.12); border-color: rgba(255, 171, 0, 0.35); color: #e69500;'}
        title={daemonConnected ? 'Connected to ClearWire privileged eBPF daemon' : 'Connecting to daemon at [::1]:50051...'}
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          style={daemonConnected ? 'background: var(--ok);' : 'background: #e69500;'}
        ></span>
        <span>{daemonConnected ? 'Daemon Online' : 'Connecting...'}</span>
      </div>
    </div>
  {:else}
    <!-- COMPACT MODE: Unified top bar -->
    <div class="flex items-center gap-2 px-2 shrink-0">
      <div class="relative">
        <button
          class="hb"
          title="Main menu"
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          on:click|stopPropagation={() => (isMenuOpen = !isMenuOpen)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M2.500 4h11M2.500 8h11M2.500 12h11" />
          </svg>
        </button>

        {#if isMenuOpen}
          <div class="menu" style="left: 0; right: auto;">
            <button class="mi" type="button" on:click={() => handleMenuAction('allow')}>
              Allow all connections
            </button>
            <button class="mi" type="button" on:click={() => handleMenuAction('deny')}>
              Block all connections
            </button>
            <button class="mi" type="button" on:click={() => handleMenuAction('reset')}>
              Reset rules
            </button>
            <hr class="my-1 border-line" />
            <button class="mi" type="button" on:click={() => handleMenuAction('theme')}>
              Toggle dark mode
            </button>
            <button class="mi" type="button" on:click={() => handleMenuAction('about')}>
              About clearWire
            </button>
          </div>
        {/if}
      </div>

      <span class="font-bold text-[13px] text-tx tracking-tight">
        clearWire
      </span>
    </div>

    <!-- Center Section: Title & shield icon in compact view -->
    <div
      class="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2"
      data-tauri-drag-region
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--down)" stroke-width="1.5" class="shrink-0 pointer-events-none">
        <path d="M8 1.500 13.500 4v4c0 3-2.300 5.300-5.500 6.500C4.800 13.300 2.500 11 2.500 8V4z" />
      </svg>
      <span class="font-semibold text-[13px] truncate text-tx pointer-events-none">
        {title}
      </span>
    </div>
  {/if}

  <!-- RIGHT SECTION (Matching Image 2): Theme Toggle + Window Controls -->
  <div class="flex items-center gap-1.5 px-3 shrink-0">
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

    <!-- Theme Switcher (◑) -->
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

    <!-- Window Controls (- ▢ ✕) -->
    <WindowControls />
  </div>
</header>
