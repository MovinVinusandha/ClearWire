<script lang="ts">
  import ChartArea from '../../components/ChartArea.svelte';
  import type { TimeRange } from '../../types';

  export let downloadData: number[] = [];
  export let uploadData: number[] = [];
  export let timeRange: TimeRange = 'Last Hour';
  export let isCompact: boolean = false;
  export let onSelectRange: (range: TimeRange) => void = () => {};
</script>

<ChartArea
  {downloadData}
  {uploadData}
  {timeRange}
  {isCompact}
  {onSelectRange}
/>
