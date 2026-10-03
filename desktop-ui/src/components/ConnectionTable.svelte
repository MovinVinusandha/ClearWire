<script lang="ts">
  import type { ActiveTableRow } from '../types';
  import { fmt } from '../mockData';

  export let activeRows: ActiveTableRow[] = [];
  export let onSetRule: (appIndex: number, domainIndex: number, rule: 'allow' | 'deny') => void;
  export let onSelect: (appIndex: number, domainIndex: number | null) => void = () => {};

  let searchQuery = '';
  let statusFilter: 'all' | 'allow' | 'deny' = 'all';
  type SortField = 'rate' | 'process' | 'domain' | 'port';
  let sortField: SortField = 'rate';
  let sortAsc = false;

  $: filteredRows = activeRows.filter(({ app, domain }) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      app.n.toLowerCase().includes(q) ||
      domain.n.toLowerCase().includes(q) ||
      domain.ip.includes(q) ||
      String(domain.port).includes(q) ||
      domain.proto.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' || domain.s === statusFilter;

    return matchesSearch && matchesStatus;
  });

  $: sortedRows = [...filteredRows].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'rate') {
      cmp = b.domain.rate - a.domain.rate;
    } else if (sortField === 'process') {
      cmp = a.app.n.localeCompare(b.app.n);
    } else if (sortField === 'domain') {
      cmp = a.domain.n.localeCompare(b.domain.n);
    } else if (sortField === 'port') {
      cmp = a.domain.port - b.domain.port;
    }
    return sortAsc ? -cmp : cmp;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = false;
    }
  }
</script>

<section id="csec" class="flex-1 min-h-0 flex flex-col select-none">
  <!-- Section Header Bar with Title, Counters, Search, and Status Filter -->
  <div class="px-3 pt-2.5 pb-2 shrink-0 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-side/40">
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-down animate-pulse"></div>
      <span class="font-bold text-[13px] text-tx tracking-tight">Active Connections</span>
      <span class="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-panel border border-line text-mute">
        {filteredRows.length}{#if filteredRows.length !== activeRows.length} / {activeRows.length}{/if}
      </span>
    </div>

    <!-- Quick Search & Filter Controls -->
    <div class="flex items-center gap-1.5 ml-auto">
      <label class="flex items-center gap-1.5 bg-hov rounded-md px-2 h-7 focus-within:ring-1 ring-down">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="text-mute">
          <circle cx="7" cy="7" r="4.500" />
          <path d="M10.500 10.500 14 14" />
        </svg>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Filter connections…"
          class="w-28 sm:w-36 bg-transparent outline-none text-[12px] placeholder:text-mute text-tx"
        />
        {#if searchQuery}
          <button
            type="button"
            class="text-mute hover:text-tx text-[10px]"
            on:click={() => (searchQuery = '')}
            title="Clear"
          >
            ✕
          </button>
        {/if}
      </label>

      <!-- Status Seg Filter -->
      <div class="seg h-7 shrink-0">
        <button
          type="button"
          class:on={statusFilter === 'all'}
          on:click={() => (statusFilter = 'all')}
          title="All"
          class="text-[11px] px-2"
        >
          All
        </button>
        <button
          type="button"
          class:on={statusFilter === 'allow'}
          class:a={statusFilter === 'allow'}
          on:click={() => (statusFilter = 'allow')}
          title="Allowed only"
          class="px-2"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={statusFilter === 'allow' ? '#fff' : 'var(--ok)'} stroke-width="2">
            <path d="m2 6.500 2.700 2.700L10 3.500" />
          </svg>
        </button>
        <button
          type="button"
          class:on={statusFilter === 'deny'}
          class:d={statusFilter === 'deny'}
          on:click={() => (statusFilter = 'deny')}
          title="Blocked only"
          class="px-2"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={statusFilter === 'deny' ? '#fff' : 'var(--no)'} stroke-width="2">
            <path d="m3 3 6 6M9 3l-6 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Table Container -->
  <div class="flex-1 overflow-y-auto overflow-x-hidden">
    <table class="w-full border-collapse text-[12px]">
      <thead>
        <tr>
          <!-- Process Sortable Header -->
          <th class="cursor-pointer select-none hover:text-tx" on:click={() => toggleSort('process')}>
            <span class="inline-flex items-center gap-1">
              Process
              {#if sortField === 'process'}
                <span class="text-[10px] text-down">{sortAsc ? '▲' : '▼'}</span>
              {/if}
            </span>
          </th>

          <!-- Destination Sortable Header -->
          <th class="c-dst cursor-pointer select-none hover:text-tx" on:click={() => toggleSort('domain')}>
            <span class="inline-flex items-center gap-1">
              Destination & IP
              {#if sortField === 'domain'}
                <span class="text-[10px] text-down">{sortAsc ? '▲' : '▼'}</span>
              {/if}
            </span>
          </th>

          <!-- Port Header -->
          <th class="c-port cursor-pointer select-none hover:text-tx" on:click={() => toggleSort('port')}>
            <span class="inline-flex items-center gap-1">
              Port
              {#if sortField === 'port'}
                <span class="text-[10px] text-down">{sortAsc ? '▲' : '▼'}</span>
              {/if}
            </span>
          </th>

          <!-- Protocol Header -->
          <th class="c-proto">Proto</th>

          <!-- Bandwidth Sortable Header -->
          <th class="cursor-pointer select-none hover:text-tx" on:click={() => toggleSort('rate')}>
            <span class="inline-flex items-center gap-1">
              Bandwidth
              {#if sortField === 'rate'}
                <span class="text-[10px] text-down">{sortAsc ? '▲' : '▼'}</span>
              {/if}
            </span>
          </th>

          <!-- Rule Header -->
          <th class="text-right pr-4">Firewall Rule</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedRows as { app, appIndex, domain, domainIndex }}
          <tr class="group border-b border-line/40 transition-colors hover:bg-hov/70">
            <!-- Process Icon + Name + Subtitle (domain in narrow mode) -->
            <td class="py-2">
              <div
                class="inline-flex items-center gap-2.5 cursor-pointer"
                on:click={() => onSelect(appIndex, null)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && onSelect(appIndex, null)}
                title="Filter by {app.n}"
              >
                <span class="ic s shrink-0 shadow-sm" style="--c: {app.c}">{app.l}</span>
                <span class="min-w-0">
                  <span class="block font-semibold text-tx leading-tight group-hover:text-down transition-colors">
                    {app.n}
                  </span>
                  <span class="sub text-mute text-[11px] truncate max-w-[160px]">
                    {domain.n} · <span class="font-mono text-[10px]">{domain.ip}</span>
                  </span>
                </span>
              </div>
            </td>

            <!-- Destination Domain + IP Badge -->
            <td class="c-dst py-2">
              <div
                class="flex items-center gap-1.5 cursor-pointer"
                on:click={() => onSelect(appIndex, domainIndex)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && onSelect(appIndex, domainIndex)}
                title="Filter by {domain.n}"
              >
                <span class="gl shrink-0 opacity-75 group-hover:opacity-100">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M2 8h12M8 2c2.500 2.200 2.500 9.800 0 12M8 2c-2.500 2.200-2.500 9.800 0 12" />
                  </svg>
                </span>
                <span class="font-medium text-tx truncate max-w-[170px] group-hover:underline decoration-line">
                  {domain.n}
                </span>
                <span class="c-ip text-mute font-mono text-[10px] px-1 py-0.5 rounded bg-hov/80 border border-line/60">
                  {domain.ip}
                </span>
              </div>
            </td>

            <!-- Port Pill Badge -->
            <td class="c-port py-2">
              <span class="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-tx bg-hov/90 border border-line/50">
                {domain.port}
              </span>
            </td>

            <!-- Protocol Badge -->
            <td class="c-proto py-2">
              <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider {domain.proto === 'TCP' ? 'text-[#3584e4] bg-[#3584e4]/10' : 'text-[#9141ac] bg-[#9141ac]/10'}">
                {domain.proto}
              </span>
            </td>

            <!-- Bandwidth -->
            <td class="py-2">
              <div class="flex items-center gap-2 text-[11px] font-medium leading-tight whitespace-nowrap">
                <span class="text-down inline-flex items-center gap-1 font-semibold">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M5 9 1 4.500h2.700V1h2.600v3.500H9z" />
                  </svg>
                  {fmt(domain.rate)}/s
                </span>
                <span class="text-up inline-flex items-center gap-1 opacity-80 text-[10px]">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M5 1 9 5.500H6.300V9H3.700V5.500H1z" />
                  </svg>
                  {fmt(domain.rate * 0.12)}/s
                </span>
              </div>
            </td>

            <!-- Rule Controls: Adwaita Segmented Switch Button -->
            <td class="text-right pr-4 py-2">
              <div class="inline-flex items-center gap-1.5">
                <div class="sw {domain.s}" title={domain.s === 'deny' ? 'Blocked' : 'Allowed'}>
                  <button
                    type="button"
                    class="wb-rule {domain.s === 'deny' ? 'active-deny' : ''}"
                    on:click|stopPropagation={() => onSetRule(appIndex, domainIndex, 'deny')}
                    title="Block connection"
                  >
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" class="w-2.5 h-2.5">
                      <path d="m3 3 6 6M9 3l-6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="wb-rule {domain.s === 'allow' ? 'active-allow' : ''}"
                    on:click|stopPropagation={() => onSetRule(appIndex, domainIndex, 'allow')}
                    title="Allow connection"
                  >
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" class="w-2.5 h-2.5">
                      <path d="m2 6.5 2.7 2.7L10 3.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="text-center py-12">
              <div class="flex flex-col items-center justify-center gap-2 text-mute">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-60">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.93 4.93 14.14 14.14" />
                </svg>
                <div class="text-[13px] font-medium text-tx">No active connections found</div>
                <div class="text-[11px]">
                  {#if searchQuery || statusFilter !== 'all'}
                    No connections match your search or filter query.
                  {:else}
                    There are no current network sockets open.
                  {/if}
                </div>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .wb-rule {
    width: 22px;
    height: 100%;
    display: grid;
    place-items: center;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--tx);
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .wb-rule:hover {
    background: color-mix(in srgb, var(--tx) 15%, transparent);
  }
  .wb-rule.active-deny {
    background: var(--no) !important;
    color: #fff !important;
  }
  .wb-rule.active-allow {
    background: var(--ok) !important;
    color: #fff !important;
  }
</style>
