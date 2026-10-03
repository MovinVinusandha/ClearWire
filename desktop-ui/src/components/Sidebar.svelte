<script lang="ts">
  import type { AppProcess, SelectionState, FilterMode, TimeRange } from '../types';
  import { fmt, getAppStatus, agg } from '../mockData';

  export let apps: AppProcess[] = [];
  export let selected: SelectionState | null = null;
  export let searchQuery: string = '';
  export let filterMode: FilterMode = 'all';
  export let timeRange: TimeRange = 'Last Hour';
  export let sentTotal: number = 0;
  export let recvTotal: number = 0;
  export let uploadData: number[] = [];
  export let downloadData: number[] = [];
  export let isCompact: boolean = false;

  export let onSelect: (appIndex: number, domainIndex: number | null) => void;
  export let onSelectAll: () => void;
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

  // 24-interval mini-bar calculations using agg()
  $: d2 = agg(downloadData, 24);
  $: u2 = agg(uploadData, 24);
  $: m2 = Math.max(...d2, ...u2, 1) * 1.1;

  $: miniBars = d2.map((dVal, i) => {
    const uVal = u2[i] || 0;
    const hu = Math.min(100, Math.max(0, (uVal / m2) * 100));
    const hd = Math.min(100, Math.max(0, (dVal / m2) * 100));
    return { hu, hd };
  });

</script>

<aside id="side" class="{isCompact ? 'w-full border-r-0' : 'w-72 shrink-0 border-r'} flex flex-col bg-side border-line h-full select-none">
  <!-- Search & filter bar -->
  <div class="flex items-center gap-1.5 p-2.5 shrink-0">
    <label class="flex-1 flex items-center gap-1.5 bg-hov rounded-lg px-2.5 h-8 focus-within:ring-2 ring-down">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" class="text-mute">
        <circle cx="7" cy="7" r="4.500" />
        <path d="M10.500 10.500 14 14" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search"
        class="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-mute text-tx"
      />
    </label>
    <div class="seg h-8 shrink-0">
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
        class:a={filterMode === 'allow'}
        on:click={() => (filterMode = 'allow')}
        title="Allowed only"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={filterMode === 'allow' ? '#fff' : 'var(--ok)'} stroke-width="2">
          <path d="m2 6.500 2.700 2.700L10 3.500" />
        </svg>
      </button>
      <button
        type="button"
        class:on={filterMode === 'deny'}
        class:d={filterMode === 'deny'}
        on:click={() => (filterMode = 'deny')}
        title="Blocked only"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={filterMode === 'deny' ? '#fff' : 'var(--no)'} stroke-width="2">
          <path d="m3 3 6 6M9 3l-6 6" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Process List -->
  <div class="flex-1 overflow-y-auto py-1">
    <!-- "All activity" Entry (when not searching) -->
    {#if !searchQuery.trim()}
      <div
        class="row flex items-center gap-2 mx-1.5 pl-2 pr-2 h-9 rounded-lg hover:bg-hov cursor-default transition-colors {selected === null ? '!bg-sel' : ''}"
        on:click={onSelectAll}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && onSelectAll()}
      >
        <span class="ic" style="--c:#3584e4">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round">
            <path d="M3 13V8M6.500 13V3M10 13V6M13.500 13V9" />
          </svg>
        </span>
        <span class="text-[13px] font-semibold text-tx">All activity</span>
      </div>
    {/if}

    {#each apps as app, ai}
      {@const matchingDomains = app.d.filter((d) => domainMatches(app.n, d.n, d.s))}
      {#if matchingDomains.length > 0}
        {@const isOpen = app.open || searchQuery.trim().length > 0}
        {@const status = getAppStatus(app)}
        {@const isAppSelected = selected !== null && selected.a === ai && selected.d === null}
        {@const avgSpark = getAverageSpark(app)}

        <!-- App Row -->
        <div
          class="row flex items-center gap-2 mx-1.5 pl-1 pr-2 h-9 rounded-lg hover:bg-hov cursor-default transition-colors {isAppSelected ? '!bg-sel' : ''}"
          on:click={() => onSelect(ai, null)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && onSelect(ai, null)}
        >
          <!-- Chevron -->
          <button
            type="button"
            class="chev text-mute w-5 h-8 -ml-1 grid place-items-center transition-transform duration-150 {isOpen ? 'rotate-90' : ''}"
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
          <span class="truncate text-[13px] font-semibold text-tx {status === 'deny' ? 'opacity-60' : ''}">
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
              class="row flex items-center gap-2 mx-1.5 pl-1 pr-2 h-8 rounded-lg hover:bg-hov cursor-default transition-colors {isDomainSelected ? '!bg-sel' : ''}"
              on:click={() => onSelect(ai, di)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && onSelect(ai, di)}
            >
              <span class="w-4 shrink-0"></span>
              <span class="gl ml-3">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M2 8h12M8 2c2.500 2.200 2.500 9.800 0 12M8 2c-2.500 2.200-2.500 9.800 0 12" />
                </svg>
              </span>
              <span class="flex-1 truncate text-tx {d.s === 'deny' ? 'opacity-60' : ''}">{d.n}</span>

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
  {#if !isCompact}
    <div id="miniBox" class="border-t border-line px-2.5 pt-2 pb-1.5 shrink-0">
      <div class="grid grid-cols-2 gap-1.5 mb-2">
        <div class="pill up">
          <i>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 1 9 5.500H6.300V9H3.700V5.500H1z" />
            </svg>
          </i>
          sent
          <b class="ml-auto text-tx font-semibold">{fmt(sentTotal)}</b>
        </div>
        <div class="pill down">
          <i>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 9 1 4.500h2.700V1h2.600v3.500H9z" />
            </svg>
          </i>
          received
          <b class="ml-auto text-tx font-semibold">{fmt(recvTotal)}</b>
        </div>
      </div>

      <!-- Mini chart in CSS bars -->
      <div class="bars h-24">
        {#each miniBars as bar}
          <div class="c">
            <div class="h t">
              <i style="height: {bar.hu.toFixed(1)}%;"></i>
            </div>
            <div class="h b">
              <i style="height: {bar.hd.toFixed(1)}%;"></i>
            </div>
          </div>
        {/each}
      </div>

      <!-- Time range navigator -->
      <div class="flex items-center justify-between mt-1.5 text-[13px]">
        <button class="tb" title="Earlier range" type="button" on:click={onPrevRange}>
          ‹
        </button>
        <span class="font-medium text-[12px] text-tx">{timeRange}</span>
        <button class="tb" title="Later range" type="button" on:click={onNextRange}>
          ›
        </button>
      </div>
    </div>
  {/if}
</aside>
