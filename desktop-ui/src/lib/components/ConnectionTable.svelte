<script lang="ts">
  import ConnectionTable from '../../components/ConnectionTable.svelte';
  import type { ActiveTableRow } from '../../types';

  export let activeRows: ActiveTableRow[] = [];
  export let onSetRule: (appIndex: number, domainIndex: number, rule: 'allow' | 'deny') => void = () => {};
  export let onSelect: (appIndex: number, domainIndex: number | null) => void = () => {};
</script>

<ConnectionTable
  {activeRows}
  {onSetRule}
  {onSelect}
/>
