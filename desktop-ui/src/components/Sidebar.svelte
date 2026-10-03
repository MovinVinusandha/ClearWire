<script lang="ts">
  import type { AppProcess, SelectionState, FilterMode, TimeRange } from '../types';
  import { fmt, getAppStatus } from '../mockData';

  export let apps: AppProcess[] = [];
  export let selected: SelectionState | null = null;
  export let searchQuery: string = '';
  export let filterMode: FilterMode = 'all';
  export let timeRange: TimeRange = 'Last Hour';
  export let sentTotal: number = 0;
  export let recvTotal: number = 0;
  export let uploadData: number[] = [];
  export let downloadData: number[] = [];

  export let onSelect: (appIndex: number, domainIndex: number | null) => void;
  export let onToggleOpen: (appIndex: number) => void;
  export let onSetRule: (appIndex: number, domainIndex: number | null, rule: 'allow' | 'deny') => void;
  export let onPrevRange: () => void;
  export let onNextRange: () => void;

  function sparkGradient(up: number, down: number): string {
    const total = up + down || 1;
    const p = Math.round((up / total) * 100);
    return `linear-gradient(to top, var(--down) ${100 - p}%, var(--up) ${100 - p}%)`;
  }

  function domainMatches(appName: string, domainName: string, status: string): boolean {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || appName.toLowerCase().includes(q) || domainName.toLowerCase().includes(q);
    const matchesFilter = filterMode === 'all' || status === filterMode;
    return matchesSearch && matchesFilter;
  }

  function getAverageSpark(app: AppProcess): number[] {
    if (!app.d.length || !app.d[0].sp) return Array(10).fill(10);
    return app.d[0].sp.map((_, i) =>
      Math.floor(app.d.reduce((sum, d) => sum + (d.sp[i] || 0), 0) / app.d.length)
    );
  }

  // Mini graph calculation for the last 24 intervals
  $: maxVal = Math.max(...downloadData, ...uploadData, 1) * 1.08;
  $: miniBars = Array.from({ length: 24 }, (_, i) => {
    const k = Math.max(0, downloadData.length - 24 + i);
    const upVal = uploadData[k] || 0;
    const downVal = downloadData[k] || 0;
    const hu = Math.max(1, (upVal / maxVal) * 17);
    const hd = Math.max(1, (downVal / maxVal) * 17);
    const x = i * 5 + 0.8;
    return {
      x,
      yUp: 19 - hu,
      hUp: hu,
      yDown: 21,
      hDown: hd,
    };
  });
</script>

<aside class="w-full md:w-72 lg:w-80 h-[460px] md:h-full shrink-0 flex flex-col bg-side border-r border-line select-none">
  <!-- Top window header controls -->
  <div class="flex items-center gap-1 px-3 h-10 shrink-0">
    <span class="flex gap-2 mr-auto">
      <b class="tl" style="background:#ff5f57"></b>
      <b class="tl" style="background:#febc2e"></b>
      <b class="tl" style="background:#28c840"></b>
    </span>
    <button class="tb" title="Filters" type="button">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
        <path d="M2 4.500h12M2 11.500h12" />
        <circle cx="10.500" cy="4.500" r="1.800" fill="var(--side)" />
        <circle cx="5.500" cy="11.500" r="1.800" fill="var(--side)" />
      </svg>
    </button>
    <button class="tb" title="Statistics" type="button">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M3 13V8M6.500 13V3M10 13V6M13.500 13V9" />
      </svg>
    </button>
    <button class="tb" title="Summary panel" type="button">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
        <rect x="2" y="3" width="12" height="10" rx="2" />
        <path d="M10 3v10" />
      </svg>
    </button>
  </div>

  <!-- Search & filter bar -->
  <div class="flex items-center gap-1.5 px-2.5 pb-2.5 shrink-0">
    <label class="flex-1 flex items-center gap-1.5 bg-panel border border-line rounded-lg px-2 h-7 focus-within:ring-2 ring-down/50">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" class="text-mute">
        <circle cx="7" cy="7" r="4.500" />
        <path d="M10.500 10.500 14 14" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search"
        class="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-mute"
      />
    </label>
    <div class="seg h-7 rounded-lg">
      <button
        type="button"
        class:on={filterMode === 'all'}
        on:click={() => (filterMode = 'all')}
        title="Show all"
      >
        All
      </button>
      <button
        type="button"
        class:on={filterMode === 'allow'}
        on:click={() => (filterMode = 'allow')}
        title="Allowed only"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--ok)" stroke-width="2">
          <path d="m2 6.500 2.700 2.700L10 3.500" />
        </svg>
      </button>
      <button
        type="button"
        class:on={filterMode === 'deny'}
        on:click={() => (filterMode = 'deny')}
        title="Blocked only"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--no)" stroke-width="2">
          <path d="m3 3 6 6M9 3l-6 6" />
        </svg>
      </button>
    </div>
  </div>

  <div class="border-t border-line"></div>

  <!-- Applications and Domains tree list -->
  <div class="flex-1 overflow-y-auto py-1">
    {#each apps as app, ai}
      {@const matchingDomains = app.d.filter((d) => domainMatches(app.n, d.n, d.s))}
      {#if matchingDomains.length > 0}
        {@const isOpen = app.open || searchQuery.trim().length > 0}
        {@const status = getAppStatus(app)}
        {@const isAppSelected = selected !== null && selected.a === ai && selected.d === null}
        {@const avgSpark = getAverageSpark(app)}

        <!-- App Row -->
        <div
          class="flex items-center gap-2 mx-1.5 pl-1 pr-2 h-9 rounded-md hover:bg-hov cursor-default transition-colors {isAppSelected ? '!bg-sel' : ''}"
          on:click={() => onSelect(ai, null)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && onSelect(ai, null)}
        >
          <!-- Chevron -->
          <button
            type="button"
            class="text-mute w-3 transition-transform duration-150 flex items-center justify-center {isOpen ? 'rotate-90' : ''}"
            on:click|stopPropagation={() => onToggleOpen(ai)}
            title="Expand/Collapse"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="m3 1.500 3.500 3.500L3 8.500" />
            </svg>
          </button>

          <!-- App Icon -->
          <span class="ic" style="--c: {app.c}">{app.l}</span>

          <!-- App Name -->
          <span class="truncate text-[13px] font-semibold {status === 'deny' ? 'opacity-60' : ''}">
            {app.n}
          </span>

          {#if app.ext}
            <em class="ext">EXT</em>
          {/if}

          <span class="flex-1"></span>

          <!-- Sparkline -->
          <div class="sp">
            {#each avgSpark as h}
              <i style="height: {h}%; background: {sparkGradient(app.up, app.down)}"></i>
            {/each}
          </div>

          <!-- Allow / Deny Switch -->
          <div
            class="sw {status}"
            title={status === 'deny' ? 'Blocked' : status === 'allow' ? 'Allowed' : 'Partly blocked'}
          >
            <b
              role="button"
              tabindex="0"
              on:click|stopPropagation={() => onSetRule(ai, null, 'deny')}
              on:keydown={(e) => e.key === 'Enter' && onSetRule(ai, null, 'deny')}
              title="Block Process"
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="m3 3 6 6M9 3l-6 6" />
              </svg>
            </b>
            <b
              role="button"
              tabindex="0"
              on:click|stopPropagation={() => onSetRule(ai, null, 'allow')}
              on:keydown={(e) => e.key === 'Enter' && onSetRule(ai, null, 'allow')}
              title="Allow Process"
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="m2 6.5 2.7 2.7L10 3.5" />
              </svg>
            </b>
          </div>
        </div>

        <!-- Domain Rows (when open) -->
        {#if isOpen}
          {#each matchingDomains as d}
            {@const di = app.d.indexOf(d)}
            {@const isDomainSelected = selected !== null && selected.a === ai && selected.d === di}
            <div
              class="flex items-center gap-2 mx-1.5 pl-6 pr-2 h-8 rounded-md hover:bg-hov cursor-default transition-colors {isDomainSelected ? '!bg-sel' : ''}"
              on:click={() => onSelect(ai, di)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && onSelect(ai, di)}
            >
              <span class="w-3"></span>
              <span class="gl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M2 8h12M8 2c2.500 2.200 2.500 9.800 0 12M8 2c-2.500 2.200-2.500 9.800 0 12" />
                </svg>
              </span>
              <span class="flex-1 truncate {d.s === 'deny' ? 'opacity-60' : ''}">{d.n}</span>

              <!-- Domain Sparkline -->
              <div class="sp">
                {#each d.sp as h}
                  <i style="height: {h}%; background: {sparkGradient(d.up, d.down)}"></i>
                {/each}
              </div>

              <!-- Domain Switch -->
              <div class="sw {d.s}" title={d.s === 'deny' ? 'Blocked' : 'Allowed'}>
                <b
                  role="button"
                  tabindex="0"
                  on:click|stopPropagation={() => onSetRule(ai, di, 'deny')}
                  on:keydown={(e) => e.key === 'Enter' && onSetRule(ai, di, 'deny')}
                  title="Block Domain"
                >
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="m3 3 6 6M9 3l-6 6" />
                  </svg>
                </b>
                <b
                  role="button"
                  tabindex="0"
                  on:click|stopPropagation={() => onSetRule(ai, di, 'allow')}
                  on:keydown={(e) => e.key === 'Enter' && onSetRule(ai, di, 'allow')}
                  title="Allow Domain"
                >
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="m2 6.5 2.7 2.7L10 3.5" />
                  </svg>
                </b>
              </div>
            </div>
          {/each}

          {#if !searchQuery.trim()}
            <div class="pl-[60px] h-6 flex items-center text-mute text-[11px]">
              {app.d.length * 37 + 3} more…
            </div>
          {/if}
        {/if}
      {/if}
    {:else}
      <div class="text-mute text-center p-6 text-[12px]">
        No matching apps or domains.<br />Try a different search or filter.
      </div>
    {/each}
  </div>

  <!-- Bottom sent/received counters & mini graph -->
  <div class="border-t border-line px-2.5 pt-2 pb-1.5 shrink-0">
    <div class="grid grid-cols-2 gap-1.5 mb-2">
      <div
        class="flex items-center gap-1.5 px-2 h-6 rounded-md font-medium text-[11px]"
        style="background: color-mix(in srgb, var(--up) 24%, var(--panel)); color: var(--up)"
      >
        ↑ sent
        <b class="ml-auto text-tx font-semibold">{fmt(sentTotal)}</b>
      </div>
      <div
        class="flex items-center gap-1.5 px-2 h-6 rounded-md font-medium text-[11px]"
        style="background: color-mix(in srgb, var(--down) 24%, var(--panel)); color: var(--down)"
      >
        ↓ received
        <b class="ml-auto text-tx font-semibold">{fmt(recvTotal)}</b>
      </div>
    </div>

    <!-- Mini chart -->
    <div class="mg">
      <svg viewBox="0 0 120 40" preserveAspectRatio="none" class="w-full h-24">
        {#each miniBars as bar}
          <rect class="bu" x={bar.x} y={bar.yUp} width="3.4" height={bar.hUp} rx="0.8" />
          <rect class="bd" x={bar.x} y={bar.yDown} width="3.4" height={bar.hDown} rx="0.8" />
        {/each}
      </svg>
    </div>

    <!-- Time range navigator -->
    <div class="flex items-center justify-between mt-1.5 text-[13px]">
      <button class="tb" title="Earlier range" type="button" on:click={onPrevRange}>
        ‹
      </button>
      <span class="font-medium text-[12px]">{timeRange}</span>
      <button class="tb" title="Later range" type="button" on:click={onNextRange}>
        ›
      </button>
    </div>
  </div>
</aside>
