<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { invoke } from '@tauri-apps/api/core';
  import type {
    AppProcess,
    SelectionState,
    FilterMode,
    TimeRange,
    ActiveTableRow,
    TabMode,
    LayoutMode,
    TrafficEventPayload,
    DaemonStatusPayload
  } from './types';
  import {
    createInitialApps,
    generateGraphData,
    stepGraphData,
    handleIncomingTrafficEvent,
    TIME_RANGES
  } from './mockData';

  import Sidebar from './components/Sidebar.svelte';
  import WindowHeaderBar from './components/WindowHeaderBar.svelte';
  import ChartArea from './components/ChartArea.svelte';
  import ConnectionTable from './components/ConnectionTable.svelte';
  import SummaryPanel from './components/SummaryPanel.svelte';

  const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  let apps: AppProcess[] = isTauriEnv ? [] : createInitialApps();
  let isDaemonConnected: boolean = false;
  let unlistenTraffic: UnlistenFn | null = null;
  let unlistenStatus: UnlistenFn | null = null;
  let selected: SelectionState | null = null;
  let searchQuery: string = '';
  let filterMode: FilterMode = 'all';
  let timeRange: TimeRange = 'Last Hour';
  let theme: 'light' | 'dark' = 'dark';

  let layoutMode: LayoutMode = 'wide';
  let activeTab: TabMode = 'apps';
  let isSummaryDrawerOpen: boolean = false;

  let toastMessage: string = '';
  let isToastVisible: boolean = false;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  let downloadData: number[] = [];
  let uploadData: number[] = [];
  let timerId: ReturnType<typeof setInterval> | null = null;

  // Initialize graph data
  const initialData = isTauriEnv
    ? { download: Array(96).fill(0), upload: Array(96).fill(0) }
    : generateGraphData(timeRange);
  downloadData = initialData.download;
  uploadData = initialData.upload;

  $: title = !selected
    ? 'All activity'
    : apps[selected.a]
      ? apps[selected.a].n +
        (selected.d !== null && apps[selected.a].d[selected.d]
          ? ' › ' + apps[selected.a].d[selected.d].n
          : '')
      : 'All activity';

  $: totalUp = apps.reduce((s, a) => s + a.up, 0);
  $: totalDown = apps.reduce((s, a) => s + a.down, 0);
  $: sentTotal = totalUp * 0.04;
  $: recvTotal = totalDown * 0.04;

  $: activeRows = (() => {
    const rows: ActiveTableRow[] = [];
    apps.forEach((app, ai) => {
      app.d.forEach((domain, di) => {
        if (!selected || (selected.a === ai && (selected.d === null || selected.d === di))) {
          rows.push({
            app,
            appIndex: ai,
            domain,
            domainIndex: di,
          });
        }
      });
    });
    return rows;
  })();

  function showToast(message: string) {
    toastMessage = message;
    isToastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      isToastVisible = false;
    }, 2200);
  }

  function handleSelectAll() {
    selected = null;
    if (layoutMode === 'compact') {
      activeTab = 'graph';
    }
  }

  function handleSelect(appIndex: number, domainIndex: number | null) {
    if (domainIndex === null) {
      const isSame = selected && selected.a === appIndex && selected.d === null;
      if (isSame && layoutMode !== 'compact') {
        apps[appIndex].open = !apps[appIndex].open;
        if (!apps[appIndex].open) {
          selected = null;
        }
      } else {
        apps[appIndex].open = true;
        selected = { a: appIndex, d: null };
      }
    } else {
      if (selected && selected.a === appIndex && selected.d === domainIndex && layoutMode !== 'compact') {
        selected = null;
      } else {
        selected = { a: appIndex, d: domainIndex };
      }
    }
    apps = [...apps];

    if (layoutMode === 'compact') {
      activeTab = 'conn';
    }
  }

  function handleToggleOpen(appIndex: number) {
    apps[appIndex].open = !apps[appIndex].open;
    apps = [...apps];
  }

  function handleSetRule(appIndex: number, domainIndex: number | null, rule: 'allow' | 'deny') {
    if (domainIndex === null) {
      apps[appIndex].d.forEach((d) => (d.s = rule));
    } else {
      apps[appIndex].d[domainIndex].s = rule;
    }
    apps = [...apps];
  }

  function handleSelectRange(range: TimeRange) {
    timeRange = range;
    const res = generateGraphData(range);
    downloadData = res.download;
    uploadData = res.upload;
  }

  function handlePrevRange() {
    const idx = TIME_RANGES.indexOf(timeRange);
    const prevIdx = (idx + TIME_RANGES.length - 1) % TIME_RANGES.length;
    handleSelectRange(TIME_RANGES[prevIdx]);
  }

  function handleNextRange() {
    const idx = TIME_RANGES.indexOf(timeRange);
    const nextIdx = (idx + 1) % TIME_RANGES.length;
    handleSelectRange(TIME_RANGES[nextIdx]);
  }

  function handleToggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  function handleGlobalAction(action: 'allow' | 'deny' | 'reset' | 'theme' | 'about') {
    if (action === 'allow') {
      apps.forEach((a) => a.d.forEach((d) => (d.s = 'allow')));
      apps = [...apps];
      showToast('All connections allowed');
    } else if (action === 'deny') {
      apps.forEach((a) => a.d.forEach((d) => (d.s = 'deny')));
      apps = [...apps];
      showToast('All connections blocked');
    } else if (action === 'reset') {
      apps.forEach((a, i) =>
        a.d.forEach((d, j) => {
          d.s = (i + j) % 5 === 3 ? 'deny' : 'allow';
        })
      );
      apps = [...apps];
      showToast('Rules reset to defaults');
    } else if (action === 'theme') {
      handleToggleTheme();
    } else if (action === 'about') {
      showToast('clearWire 1.0 · sample data');
    }
  }

  function updateLayout() {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const prevMode = layoutMode;
    layoutMode = w >= 1180 ? 'wide' : w >= 800 ? 'mid' : 'compact';
    if (layoutMode === 'wide') {
      isSummaryDrawerOpen = false;
    }
    if (prevMode !== layoutMode && layoutMode === 'compact') {
      activeTab = 'apps';
    }
  }

  onMount(() => {
    // Detect system color scheme default
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);

    // Safely set up Tauri event listeners if running within the Tauri runtime
    const setupTauriEvents = async () => {
      try {
        if (isTauriEnv) {
          try {
            isDaemonConnected = await invoke<boolean>('check_daemon_connected');
          } catch (invokeErr) {
            console.warn('Failed to query daemon status via invoke:', invokeErr);
          }

          unlistenTraffic = await listen<TrafficEventPayload>('traffic-event', (event) => {
            if (!isDaemonConnected) {
              isDaemonConnected = true;
            }

            const payload = event.payload;
            apps = handleIncomingTrafficEvent(apps, payload);

            if (payload.bytes_received > 0 || payload.bytes_sent > 0) {
              if (downloadData.length > 0) {
                downloadData[downloadData.length - 1] += payload.bytes_received;
                downloadData = [...downloadData];
              }
              if (uploadData.length > 0) {
                uploadData[uploadData.length - 1] += payload.bytes_sent;
                uploadData = [...uploadData];
              }
            }
          });

          unlistenStatus = await listen<DaemonStatusPayload>('daemon-status', (event) => {
            const prev = isDaemonConnected;
            isDaemonConnected = event.payload.connected;
            if (isDaemonConnected && !prev) {
              showToast('Connected to ClearWire Core Daemon');
            } else if (!isDaemonConnected && prev) {
              showToast('Disconnected from Core Daemon. Reconnecting...');
            }
          });
        }
      } catch (err) {
        console.warn('Tauri event listening not available:', err);
      }
    };
    setupTauriEvents();

    // In preview mode without Tauri, step mock graph. When in Tauri, use real live traffic.
    timerId = setInterval(() => {
      if (!isTauriEnv && timeRange === 'Last Hour') {
        const stepped = stepGraphData(downloadData, uploadData);
        downloadData = stepped.download;
        uploadData = stepped.upload;
      }
    }, 2000);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateLayout);
    }
    if (timerId) {
      clearInterval(timerId);
    }
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    if (unlistenTraffic) {
      unlistenTraffic();
      unlistenTraffic = null;
    }
    if (unlistenStatus) {
      unlistenStatus();
      unlistenStatus = null;
    }
  });
</script>

<svelte:window
  on:keydown={(e) => {
    if (e.key === 'Escape') {
      isSummaryDrawerOpen = false;
    }
  }}
/>

<div class="flex flex-col w-screen h-screen overflow-hidden bg-bg rounded-[10px] border border-line/60">
  <!-- Top Native Window Header Bar -->
  <WindowHeaderBar
    {title}
    {theme}
    daemonConnected={isDaemonConnected}
    isCompact={layoutMode === 'compact'}
    showSummaryToggle={layoutMode === 'mid'}
    onToggleTheme={handleToggleTheme}
    onToggleSummary={() => (isSummaryDrawerOpen = !isSummaryDrawerOpen)}
    onGlobalAction={handleGlobalAction}
  />

  <!-- Panes Container -->
  <div class="flex flex-1 min-h-0 relative w-full h-full">
    {#if layoutMode === 'compact'}
      <!-- Compact Mode: Active tab fills the entire window -->
      {#if activeTab === 'apps'}
        <div class="w-full h-full">
          <Sidebar
            {apps}
            {selected}
            bind:searchQuery
            bind:filterMode
            {timeRange}
            {sentTotal}
            {recvTotal}
            {uploadData}
            {downloadData}
            isCompact={true}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onToggleOpen={handleToggleOpen}
            onSetRule={handleSetRule}
            onPrevRange={handlePrevRange}
            onNextRange={handleNextRange}
          />
        </div>
      {:else if activeTab === 'graph'}
        <main class="w-full h-full flex flex-col bg-panel">
          <ChartArea
            {downloadData}
            {uploadData}
            {timeRange}
            isCompact={true}
            onSelectRange={handleSelectRange}
          />
        </main>
      {:else if activeTab === 'conn'}
        <main class="w-full h-full flex flex-col bg-panel">
          <ConnectionTable
            {activeRows}
            onSetRule={handleSetRule}
            onSelect={handleSelect}
          />
        </main>
      {:else if activeTab === 'sum'}
        <div class="w-full h-full">
          <SummaryPanel
            {apps}
            isCompact={true}
          />
        </div>
      {/if}
    {:else}
      <!-- Mid & Wide Modes: Multi-column desktop layout -->
      <div class="w-72 shrink-0 h-full">
        <Sidebar
          {apps}
          {selected}
          bind:searchQuery
          bind:filterMode
          {timeRange}
          {sentTotal}
          {recvTotal}
          {uploadData}
          {downloadData}
          isCompact={false}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onToggleOpen={handleToggleOpen}
          onSetRule={handleSetRule}
          onPrevRange={handlePrevRange}
          onNextRange={handleNextRange}
        />
      </div>

      <main class="flex-1 min-w-0 flex flex-col h-full bg-panel">
        <ChartArea
          {downloadData}
          {uploadData}
          {timeRange}
          isCompact={false}
          onSelectRange={handleSelectRange}
        />
        <ConnectionTable
          {activeRows}
          onSetRule={handleSetRule}
          onSelect={handleSelect}
        />
      </main>

      {#if layoutMode === 'wide'}
        <div class="w-72 shrink-0 h-full">
          <SummaryPanel {apps} isCompact={false} />
        </div>
      {:else if layoutMode === 'mid' && isSummaryDrawerOpen}
        <!-- Mid-width drawer slide-over -->
        <div class="absolute top-0 right-0 bottom-0 z-30 shadow-[-8px_0_30px_rgba(0,0,0,0.3)] w-80 max-w-full">
          <SummaryPanel
            {apps}
            isDrawer={true}
            isCompact={false}
            onClose={() => (isSummaryDrawerOpen = false)}
          />
        </div>
        <!-- Scrim overlay backdrop -->
        <div
          class="absolute inset-0 z-20 bg-black/35 cursor-pointer"
          on:click={() => (isSummaryDrawerOpen = false)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Escape' && (isSummaryDrawerOpen = false)}
        ></div>
      {/if}
    {/if}
  </div>

  <!-- Mobile / Compact Navigation Tabs -->
  {#if layoutMode === 'compact'}
    <nav id="tabs" style="display: flex;">
      <button class:on={activeTab === 'apps'} on:click={() => (activeTab = 'apps')} type="button">
        <i>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 5h12M3 9h12M3 13h8" />
          </svg>
        </i>
        Apps
      </button>
      <button class:on={activeTab === 'graph'} on:click={() => (activeTab = 'graph')} type="button">
        <i>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15V9M7.500 15V3M11 15V7M14.500 15V10" />
          </svg>
        </i>
        Graph
      </button>
      <button class:on={activeTab === 'conn'} on:click={() => (activeTab = 'conn')} type="button">
        <i>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2.500" y="3.500" width="13" height="11" rx="2" />
            <path d="M2.500 7.500h13M7 7.500v7" />
          </svg>
        </i>
        Connections
      </button>
      <button class:on={activeTab === 'sum'} on:click={() => (activeTab = 'sum')} type="button">
        <i>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2.500" y="3.500" width="13" height="11" rx="2" />
            <path d="M11 3.500v11" />
          </svg>
        </i>
        Summary
      </button>
    </nav>
  {/if}
</div>

<!-- Floating Action Feedback Toast -->
<div id="toast" class:on={isToastVisible}>
  {toastMessage}
</div>
