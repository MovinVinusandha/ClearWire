<script lang="ts">
  import type { AppProcess } from '../types';
  import { fmt } from '../mockData';

  export let apps: AppProcess[] = [];
  export let isDrawer: boolean = false;
  export let isCompact: boolean = false;
  export let onClose: () => void = () => {};

  $: totalUpload = apps.reduce((acc, a) => acc + a.up, 0);
  $: totalDownload = apps.reduce((acc, a) => acc + a.down, 0);

  $: allDomains = apps.flatMap((a) => a.d.map((d) => ({ ...d, appName: a.n })));
  $: deniedCount = allDomains.filter((d) => d.s === 'deny').length;
  $: unconfirmedCount = 0;
  $: incomingCount = 0;

  $: topProcesses = [...apps]
    .sort((a, b) => b.down + b.up - (a.down + a.up))
    .slice(0, 5);

  $: topDomains = [...allDomains]
    .sort((a, b) => b.down + b.up - (a.down + a.up))
    .slice(0, 6);
</script>

<aside
  id="sumP"
  class="{isCompact ? 'w-full border-l-0' : isDrawer ? 'w-80 max-w-full' : 'w-72 shrink-0 border-l'} flex flex-col gap-3 bg-side border-line p-3 overflow-y-auto h-full select-none"
  class:drawer-mode={isDrawer}
>

  <!-- Summary Header -->
  <div class="flex items-start gap-3 pt-1">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" class="text-mute mt-1">
      <path d="M2 4h12M2 8h12M2 12h8" />
    </svg>
    <div>
      <div class="text-[17px] font-semibold leading-tight text-tx">Summary</div>
      <div class="text-mute text-[12px]">{apps.length} processes, {allDomains.length} domains</div>
    </div>

    {#if isDrawer}
      <button class="hb sclose ml-auto" title="Close summary" type="button" on:click={onClose}>
        <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <path d="m1.800 1.800 6.400 6.400m0-6.400-6.400 6.400" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Global Upload / Download Total Pills -->
  <div class="grid grid-cols-2 gap-1.5">
    <div class="pill up">
      <i>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 1 9 5.500H6.300V9H3.700V5.500H1z" />
        </svg>
      </i>
      <b class="text-tx">{fmt(totalUpload)}</b>
    </div>
    <div class="pill down">
      <i>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 9 1 4.500h2.700V1h2.600v3.500H9z" />
        </svg>
      </i>
      <b class="text-tx">{fmt(totalDownload)}</b>
    </div>
  </div>

  <!-- Connections Status Breakdown -->
  <div>
    <div class="sec">
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="m2 3.500 3 3 3-3" />
      </svg>
      <span>Connections</span>
    </div>
    <div class="mt-1 px-1">
      <div class="flex items-center gap-2.5 px-1.5 h-8">
        <span class="text-mute">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="14" height="10" rx="2" />
            <path d="m7 7.500 4 3M11 7.500l-4 3" />
          </svg>
        </span>
        <span class="text-[13px] text-tx">
          <b class="text-no font-semibold">{deniedCount.toLocaleString()}</b> denied
        </span>
      </div>
      <div class="flex items-center gap-2.5 px-1.5 h-8">
        <span class="text-mute">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="14" height="10" rx="2" />
            <path d="m6.500 9 2 2 3.500-3.500" />
          </svg>
        </span>
        <span class="text-[13px] text-tx">
          <b class="text-warn font-semibold">{unconfirmedCount}</b> unconfirmed
        </span>
      </div>
      <div class="flex items-center gap-2.5 px-1.5 h-8">
        <span class="text-mute">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.500 9h8M8 6l3 3-3 3M11 4h3.500v10H11" />
          </svg>
        </span>
        <span class="text-[13px] text-tx">
          <b class="text-tx font-semibold">{incomingCount}</b> incoming
        </span>
      </div>
    </div>
  </div>

  <!-- Statistics: Top Processes & Top Domains -->
  <div>
    <div class="sec">
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="m2 3.500 3 3 3-3" />
      </svg>
      <span>Statistics</span>
    </div>

    <!-- Top Processes -->
    <div class="px-1.5 mt-2 text-[11px] text-mute font-medium">Top Processes</div>
    <div class="mt-0.5 space-y-0.5">
      {#each topProcesses as app}
        <div class="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-hov transition-colors">
          <span class="ic" style="--c: {app.c}">{app.l}</span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[13px] font-medium text-tx">{app.n}</div>
            <div class="text-mute text-[11px]">
              <span class="text-down">{fmt(app.down)}</span> down,
              <span class="text-up">{fmt(app.up)}</span> up
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Top Domains -->
    <div class="px-1.5 mt-3 text-[11px] text-mute font-medium">Top Domains</div>
    <div class="mt-0.5 space-y-0.5">
      {#each topDomains as dom}
        <div class="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-hov transition-colors">
          <div class="min-w-0 flex-1">
            <div class="truncate text-[13px] font-medium text-tx">{dom.n}</div>
            <div class="text-mute text-[11px]">
              <span class="text-down">{fmt(dom.down)}</span> down,
              <span class="text-up">{fmt(dom.up)}</span> up
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</aside>
