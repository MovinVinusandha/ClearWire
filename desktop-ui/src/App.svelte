<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type {
    AppProcess,
    SelectionState,
    FilterMode,
    TimeRange,
    ActiveTableRow
  } from './types';
  import {
    createInitialApps,
    generateGraphData,
    stepGraphData,
    TIME_RANGES
  } from './mockData';

  import Sidebar from './components/Sidebar.svelte';
  import TopNav from './components/TopNav.svelte';
  import ChartArea from './components/ChartArea.svelte';
  import ConnectionTable from './components/ConnectionTable.svelte';
  import SummaryPanel from './components/SummaryPanel.svelte';

  let apps: AppProcess[] = createInitialApps();
  let selected: SelectionState | null = null;
  let searchQuery: string = '';
  let filterMode: FilterMode = 'all';
  let timeRange: TimeRange = 'Last Hour';
  let theme: 'light' | 'dark' = 'dark';

  let downloadData: number[] = [];
  let uploadData: number[] = [];
  let timerId: ReturnType<typeof setInterval> | null = null;

  // Initialize graph data
  const initialData = generateGraphData(timeRange);
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

  function handleSelect(appIndex: number, domainIndex: number | null) {
    if (domainIndex === null) {
      const isSame = selected && selected.a === appIndex && selected.d === null;
      if (isSame) {
        apps[appIndex].open = !apps[appIndex].open;
        if (!apps[appIndex].open) {
          selected = null;
        }
      } else {
        apps[appIndex].open = true;
        selected = { a: appIndex, d: null };
      }
    } else {
      if (selected && selected.a === appIndex && selected.d === domainIndex) {
        selected = null;
      } else {
        selected = { a: appIndex, d: domainIndex };
      }
    }
    apps = [...apps];
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

  onMount(() => {
    // Detect system color scheme default
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
    }

    // Live update interval every 2 seconds
    timerId = setInterval(() => {
      if (timeRange === 'Last Hour') {
        const stepped = stepGraphData(downloadData, uploadData);
        downloadData = stepped.download;
        uploadData = stepped.upload;
      }
    }, 2000);
  });

  onDestroy(() => {
    if (timerId) {
      clearInterval(timerId);
    }
  });
</script>

<div class="flex flex-col md:flex-row h-full md:h-[calc(100%-40px)] md:m-5 md:rounded-xl overflow-y-auto md:overflow-hidden md:border border-black/30 md:shadow-[0_24px_60px_rgba(0,0,0,.4)] bg-bg">
  <!-- Left Sidebar Component -->
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
    onSelect={handleSelect}
    onToggleOpen={handleToggleOpen}
    onSetRule={handleSetRule}
    onPrevRange={handlePrevRange}
    onNextRange={handleNextRange}
  />

  <!-- Main Center Column -->
  <main class="flex-1 min-w-0 flex flex-col min-h-[700px] md:min-h-0 md:h-full bg-panel">
    <!-- TopNav Component -->
    <TopNav
      {title}
      {timeRange}
      onSelectRange={handleSelectRange}
      {theme}
      onToggleTheme={handleToggleTheme}
    />

    <!-- Bandwidth Chart Component -->
    <ChartArea
      {downloadData}
      {uploadData}
      {timeRange}
    />

    <!-- Active Connections Table Component -->
    <ConnectionTable
      {activeRows}
      onSetRule={handleSetRule}
    />
  </main>

  <!-- Right Summary Panel Component -->
  <SummaryPanel {apps} />
</div>
