<script lang="ts">
  import type { TimeRange } from '../types';
  import { fmt, RANGE_LABELS } from '../mockData';

  export let downloadData: number[] = [];
  export let uploadData: number[] = [];
  export let timeRange: TimeRange = 'Last Hour';

  let containerEl: HTMLDivElement | null = null;
  let isHovering = false;
  let hoverX = 0;
  let hoverIndex = 0;
  let tooltipLeft = 0;

  const W = 960;
  const H = 240;
  const m = H / 2; // 120

  $: n = Math.max(downloadData.length, 1);
  $: bw = W / n;
  $: maxVal = Math.max(...downloadData, ...uploadData, 1) * 1.08;

  $: currentDownRate = downloadData.length > 0 ? downloadData[downloadData.length - 1] : 0;
  $: currentUpRate = uploadData.length > 0 ? uploadData[uploadData.length - 1] : 0;

  $: bars = downloadData.map((downVal, i) => {
    const upVal = uploadData[i] || 0;
    const hd = Math.max(0.5, (downVal / maxVal) * (m - 8));
    const hu = Math.max(0.5, (upVal / maxVal) * (m - 8));
    const x = i * bw + 0.7;
    const w = Math.max(1, bw - 1.4);
    return {
      x: Number(x.toFixed(1)),
      w: Number(w.toFixed(1)),
      yUp: Number((m - hu - 1).toFixed(1)),
      hUp: Number(hu.toFixed(1)),
      yDown: Number((m + 1).toFixed(1)),
      hDown: Number(hd.toFixed(1)),
    };
  });

  $: timeLabels = RANGE_LABELS[timeRange] || [];

  function handleMouseMove(e: MouseEvent) {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const normalized = Math.min(1, Math.max(0, relX / rect.width));
    const i = Math.min(n - 1, Math.max(0, Math.floor(normalized * n)));

    hoverIndex = i;
    hoverX = ((i + 0.5) / n) * rect.width;
    tooltipLeft = hoverX > rect.width - 150 ? hoverX - 145 : hoverX + 10;
    isHovering = true;
  }

  function handleMouseLeave() {
    isHovering = false;
  }
</script>

<section class="flex flex-col h-[320px] md:h-[46%] shrink-0 px-3 pt-2.5 pb-2 border-b border-line select-none">
  <!-- Top live bandwidth indicators -->
  <div class="flex flex-wrap items-center gap-1.5 mb-2">
    <div
      class="flex items-center gap-1.5 px-2.5 h-6 rounded-md font-medium text-[11px]"
      style="background: color-mix(in srgb, var(--up) 24%, var(--panel)); color: var(--up)"
    >
      ↑ Upload
      <b class="ml-3 text-tx font-semibold">{fmt(currentUpRate)}/s</b>
    </div>
    <div
      class="flex items-center gap-1.5 px-2.5 h-6 rounded-md font-medium text-[11px]"
      style="background: color-mix(in srgb, var(--down) 24%, var(--panel)); color: var(--down)"
    >
      ↓ Download
      <b class="ml-3 text-tx font-semibold">{fmt(currentDownRate)}/s</b>
    </div>
  </div>

  <!-- Interactive SVG graph container -->
  <div
    bind:this={containerEl}
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
    role="region"
    aria-label="Network traffic graph"
    class="relative flex-1 min-h-0 rounded-lg border border-line overflow-hidden cursor-crosshair"
    style="background-color: color-mix(in srgb, var(--tx) 3%, var(--panel)); background-image: linear-gradient(90deg, var(--hov) 80%, transparent 80%); background-size: 1.0417% 100%"
  >
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
      <!-- Grid dashed lines -->
      <g stroke="var(--line)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke">
        {#each [30, 60, 180, 210] as y}
          <line x1="0" x2={W} y1={y} y2={y} stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke" />
        {/each}
      </g>

      <!-- Mirrored Bars -->
      {#each bars as bar}
        <!-- Upload Bar (Pink/Upward) -->
        <rect class="bu" x={bar.x} y={bar.yUp} width={bar.w} height={bar.hUp} rx="1.5" />
        <!-- Download Bar (Blue/Downward) -->
        <rect class="bd" x={bar.x} y={bar.yDown} width={bar.w} height={bar.hDown} rx="1.5" />
      {/each}

      <!-- Center Zero Line -->
      <line
        x1="0"
        x2={W}
        y1={m}
        y2={m}
        stroke="var(--mute)"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <!-- Top and bottom peak scale labels -->
    <span class="absolute top-1 left-2 text-[10px] text-mute pointer-events-none">
      ↑ {fmt(maxVal)}/s
    </span>
    <span class="absolute bottom-1 left-2 text-[10px] text-mute pointer-events-none">
      ↓ {fmt(maxVal)}/s
    </span>

    <!-- Hover Cursor Line -->
    {#if isHovering}
      <div
        class="absolute top-0 bottom-0 w-px bg-tx/40 pointer-events-none transition-none"
        style="left: {hoverX}px"
      ></div>

      <!-- Hover Tooltip -->
      <div
        class="absolute top-2 card px-2 py-1 pointer-events-none whitespace-nowrap shadow-md text-[11px] leading-snug z-20"
        style="left: {tooltipLeft}px"
      >
        <span class="text-down font-medium">↓ {fmt(downloadData[hoverIndex] || 0)}/s</span>
        <br />
        <span class="text-up font-medium">↑ {fmt(uploadData[hoverIndex] || 0)}/s</span>
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
