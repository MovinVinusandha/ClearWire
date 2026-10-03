<script lang="ts">
  import type { TimeRange } from '../types';
  import { TIME_RANGES } from '../mockData';

  export let title: string = 'All activity';
  export let timeRange: TimeRange = 'Last Hour';
  export let onSelectRange: (range: TimeRange) => void;
  export let theme: 'light' | 'dark' = 'dark';
  export let onToggleTheme: () => void;
</script>

<header class="flex items-center gap-3 h-10 px-3 bg-panel border-b border-line shrink-0 select-none">
  <!-- Shield Icon -->
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--down)" stroke-width="1.5" class="shrink-0">
    <path d="M8 1.500 13.500 4v4c0 3-2.300 5.300-5.500 6.500C4.800 13.300 2.500 11 2.500 8V4z" />
  </svg>

  <!-- Title / Breadcrumb -->
  <span class="font-semibold text-[13px] truncate text-tx">
    {title}
  </span>

  <!-- Range Segmented Selector (mac style) -->
  <div class="mac ml-auto max-w-full overflow-x-auto">
    {#each TIME_RANGES as range}
      <button
        type="button"
        class:on={range === timeRange}
        on:click={() => onSelectRange(range)}
      >
        {range}
      </button>
    {/each}
  </div>

  <!-- Theme Toggle -->
  <button
    class="tb shrink-0"
    title="Switch light/dark theme (current: {theme})"
    type="button"
    on:click={onToggleTheme}
  >
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
      <circle cx="8" cy="8" r="5.500" />
      <path d="M8 2.500a5.500 5.500 0 0 1 0 11z" fill="currentColor" />
    </svg>
  </button>
</header>
