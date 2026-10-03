<script lang="ts">
  import type { ActiveTableRow } from '../types';
  import { fmt } from '../mockData';

  export let activeRows: ActiveTableRow[] = [];
  export let onSetRule: (appIndex: number, domainIndex: number, rule: 'allow' | 'deny') => void;
</script>

<section id="csec" class="flex-1 min-h-0 flex flex-col select-none">
  <!-- Section Header -->
  <div class="pt-2 pb-1.5 shrink-0">
    <div class="sec" style="padding: 0 12px;">
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="m2 3.500 3 3 3-3" />
      </svg>
      <span>Active connections</span>
      <span class="ml-auto text-tx font-medium">{activeRows.length} connections</span>
    </div>
  </div>

  <!-- Connections Table -->
  <div class="flex-1 overflow-y-auto overflow-x-hidden">
    <table class="w-full border-collapse text-[12px]">
      <thead>
        <tr>
          <th>Process</th>
          <th class="c-dst">Destination</th>
          <th class="c-port">Port</th>
          <th class="c-proto">Protocol</th>
          <th>Bandwidth</th>
          <th class="text-right pr-3">Rule</th>
        </tr>
      </thead>
      <tbody>
        {#each activeRows as { app, appIndex, domain, domainIndex }}
          <tr class="border-b border-line/60 transition-colors">
            <!-- Process Icon + Name + Subtitle (domain in narrow mode) -->
            <td>
              <span class="inline-flex items-center gap-2">
                <span class="ic s" style="--c: {app.c}">{app.l}</span>
                <span class="min-w-0">
                  <span class="block font-medium text-tx">{app.n}</span>
                  <span class="sub text-mute text-[11px]">{domain.n}</span>
                </span>
              </span>
            </td>

            <!-- Destination Domain + IP -->
            <td class="c-dst">
              <span class="text-tx">{domain.n}</span>
              <span class="c-ip text-mute ml-1 font-mono text-[11px]">{domain.ip}</span>
            </td>

            <!-- Port -->
            <td class="c-port font-mono text-[11px] text-tx">{domain.port}</td>

            <!-- Protocol -->
            <td class="c-proto text-mute font-mono text-[11px]">{domain.proto}</td>

            <!-- Bandwidth -->
            <td>
              <span class="b text-down font-medium">↓ {fmt(domain.rate)}/s</span>
              <span class="b text-up font-medium ml-2">↑ {fmt(domain.rate * 0.12)}/s</span>
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
