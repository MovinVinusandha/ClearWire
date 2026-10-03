import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ActivityChart from './ActivityChart.svelte';

describe('ActivityChart Component', () => {
  it('mounts without crashing', () => {
    const handleSelectRange = vi.fn();
    const downloadData = [100, 200, 150, 300, 250];
    const uploadData = [50, 80, 60, 110, 90];

    const { container } = render(ActivityChart, {
      props: {
        downloadData,
        uploadData,
        timeRange: 'Last Hour',
        isCompact: false,
        onSelectRange: handleSelectRange,
      },
    });

    expect(container).toBeTruthy();
    expect(container.querySelector('#gsec')).toBeTruthy();
  });
});
