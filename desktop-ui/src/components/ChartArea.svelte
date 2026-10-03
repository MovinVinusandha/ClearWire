<script lang="ts">
  import type { TimeRange } from '../types';
  import { fmt, RANGE_LABELS, TIME_RANGES, agg } from '../mockData';

  export let downloadData: number[] = [];
  export let uploadData: number[] = [];
  export let timeRange: TimeRange = 'Last Hour';
  export let isCompact: boolean = false;
  export let onSelectRange: (range: TimeRange) => void;

  let isDropdownOpen = false;
  let containerEl: HTMLDivElement | null = null;
  let isHovering = false;
  let hoverIndex = 0;
  let tooltipLeft = 0;

  $: currentDownRate = downloadData.length > 0 ? downloadData[downloadData.length - 1] : 0;
  $: currentUpRate = uploadData.length > 0 ? uploadData[uploadData.length - 1] : 0;

  // 48 aggregated intervals for main chart
  $: MD = agg(downloadData, 48);
  $: MU = agg(uploadData, 48);
  $: mx = Math.max(...MD, ...MU, 1) * 1.1;

  $: chartBars = MD.map((dVal, i) => {
    const uVal = MU[i] || 0;
    const hu = Math.min(100, Math.max(0, (uVal / mx) * 100));
    const hd = Math.min(100, Math.max(0, (dVal / mx) * 100));
    return {
      hu: Number(hu.toFixed(1)),
      hd: Number(hd.toFixed(1)),
    };
  });

  $: timeLabels = RANGE_LABELS[timeRange] || [];

  function handlePointerMove(e: PointerEvent) {
    if (!containerEl || MD.length === 0) return;
    const rect = containerEl.getBoundingClientRect();
    const n = MD.length;
    const relX = e.clientX - rect.left;
    const normalized = Math.min(1, Math.max(0, relX / rect.width));
    const i = Math.min(n - 1, Math.max(0, Math.floor(normalized * n)));

    hoverIndex = i;
    const x = ((i + 0.5) / n) * rect.width;
    tooltipLeft = x > rect.width - 150 ? x - 145 : x + 10;
    isHovering = true;
  }

  function handlePointerLeave() {
    isHovering = false;
  }

  function handleSelect(r: TimeRange) {
    isDropdownOpen = false;
    onSelectRange(r);
  }
</script>

<svelte:window on:click={() => { isDropdownOpen = false; }} />

<section
  id="gsec"
  class="{isCompact ? 'flex-1 min-h-0 border-b-0' : 'flex flex-col shrink-0 border-b'} flex flex-col px-3 pt-2.5 pb-2 border-line select-none"
  style={isCompact ? '' : 'flex-basis: clamp(210px, 44%, 380px);'}
>
  <!-- Bandwidth indicators & Range Dropdown -->
  <div class="flex flex-wrap items-center gap-1.5 mb-2">
    <!-- Upload Pill -->
    <div class="pill up" style="min-width: 140px;">
      <i>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 1 9 5.500H6.300V9H3.700V5.500H1z" />
        </svg>
      </i>
      Upload
      <b class="text-tx">{fmt(currentUpRate)}/s</b>
    </div>

    <!-- Download Pill -->
    <div class="pill down" style="min-width: 140px;">
      <i>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 9 1 4.500h2.700V1h2.600v3.500H9z" />
        </svg>
      </i>
      Download
      <b class="text-tx">{fmt(currentDownRate)}/s</b>
    </div>

    <!-- Range Dropdown -->
    <div class="relative ml-auto">
      <button
        class="dd"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isDropdownOpen}
        on:click|stopPropagation={() => (isDropdownOpen = !isDropdownOpen)}
      >
        <span>{timeRange}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="m2 3.500 3 3 3-3" />
        </svg>
      </button>

      {#if isDropdownOpen}
        <div class="menu" role="listbox">
          {#each TIME_RANGES as r}
            <button
              class="mi {r === timeRange ? 'on' : ''}"
              type="button"
              role="option"
              aria-selected={r === timeRange}
              on:click={() => handleSelect(r)}
            >
              <span>{r}</span>
              <span class="ck">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="m2 6.5 2.7 2.7L10 3.5" />
                </svg>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Mirrored CSS Bars Chart Container -->
  <div
    bind:this={containerEl}
    on:pointermove={handlePointerMove}
    on:pointerleave={handlePointerLeave}
    class="relative flex-1 min-h-0 rounded-lg border border-line overflow-hidden cursor-crosshair"
    style="background: var(--panel);"
  >
    <div class="bars absolute inset-0 p-1.5">
      {#each chartBars as bar}
        <div class="c">
          <div class="h t">
            <i style="height: {bar.hu}%;"></i>
          </div>
          <div class="h b">
            <i style="height: {bar.hd}%;"></i>
          </div>
        </div>
      {/each}
    </div>

    <!-- Scale labels -->
    <span class="absolute top-1 left-2 text-[10px] text-mute pointer-events-none">
      ↑ {fmt(mx)}/s
    </span>
    <span class="absolute bottom-1 left-2 text-[10px] text-mute pointer-events-none">
      ↓ {fmt(mx)}/s
    </span>

    <!-- Hover Tooltip -->
    {#if isHovering}
      <div
        class="absolute top-2 card px-2 py-1 pointer-events-none whitespace-nowrap z-20 text-[11px] leading-snug shadow-md"
        style="left: {tooltipLeft}px;"
      >
        <span class="text-down font-medium">↓ {fmt(MD[hoverIndex] || 0)}/s</span>
        <br />
        <span class="text-up font-medium">↑ {fmt(MU[hoverIndex] || 0)}/s</span>
      </div>
    {/if}
  </div>

  <!-- X-Axis time intervals -->
  <div class="flex justify-between text-[10px] text-mute mt-1 px-0.5">
    {#each timeLabels as lbl}
      <span>{lbl}</span>
    {/each}
  </div>
</section>
