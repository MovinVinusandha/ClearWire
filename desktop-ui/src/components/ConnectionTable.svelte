<script lang="ts">
  import type { ActiveTableRow } from '../types';
  import { fmt } from '../mockData';

  export let activeRows: ActiveTableRow[] = [];
  export let onSetRule: (appIndex: number, domainIndex: number, rule: 'allow' | 'deny') => void;
</script>

<section class="flex-1 min-h-0 flex flex-col select-none">
  <!-- Section Header -->
  <div class="px-3 pt-2 pb-1.5 shrink-0">
    <div class="sec">
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="m2 3.500 3 3 3-3" />
      </svg>
      <span>Active connections</span>
      <span class="ml-auto text-tx font-medium">{activeRows.length} connections</span>
    </div>
  </div>

  <!-- Connections Table -->
  <div class="flex-1 overflow-auto">
    <table class="w-full min-w-[720px] border-collapse text-[12px]">
      <thead>
        <tr>
          <th>Process</th>
          <th>Destination</th>
          <th>Port</th>
          <th>Protocol</th>
          <th>Bandwidth</th>
          <th class="text-right pr-3">Rule</th>
        </tr>
      </thead>
      <tbody>
        {#each activeRows as { app, appIndex, domain, domainIndex }}
          <tr class="border-b border-line/60 transition-colors">
            <!-- Process Icon + Name -->
            <td>
              <span class="inline-flex items-center gap-2">
                <span class="ic s" style="--c: {app.c}">{app.l}</span>
                <span class="font-medium text-tx">{app.n}</span>
              </span>
            </td>

            <!-- Destination Domain + IP -->
            <td>
              <span class="text-tx">{domain.n}</span>
              <span class="text-mute ml-1 font-mono text-[11px]">{domain.ip}</span>
            </td>

            <!-- Port -->
            <td class="font-mono text-[11px] text-tx">{domain.port}</td>

            <!-- Protocol -->
            <td class="text-mute font-mono text-[11px]">{domain.proto}</td>

            <!-- Bandwidth -->
            <td>
              <span class="text-down font-medium">↓ {fmt(domain.rate)}/s</span>
              <span class="text-up font-medium ml-2">↑ {fmt(domain.rate * 0.12)}/s</span>
            </td>

            <!-- Segmented Allow / Deny buttons -->
            <td class="text-right pr-3">
              <div class="seg">
                <button
                  type="button"
                  class="a {domain.s === 'allow' ? 'on a' : ''}"
                  on:click={() => onSetRule(appIndex, domainIndex, 'allow')}
                  title="Allow connection"
                >
                  Allow
                </button>
                <button
                  type="button"
                  class="{domain.s === 'deny' ? 'on d' : ''}"
                  on:click={() => onSetRule(appIndex, domainIndex, 'deny')}
                  title="Deny connection"
                >
                  Deny
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="text-center text-mute py-8">
              No active connections found for the current selection.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
