import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ConnectionTable from './ConnectionTable.svelte';
import type { ActiveTableRow } from '../../types';

describe('ConnectionTable Component', () => {
  const mockRows: ActiveTableRow[] = [
    {
      appIndex: 0,
      domainIndex: 0,
      app: {
        n: 'Firefox',
        c: '#ff7139',
        l: 'F',
        open: true,
        down: 1024,
        up: 512,
        d: [],
      },
      domain: {
        n: 'mozilla.org',
        s: 'allow',
        down: 1024,
        up: 512,
        sp: [],
        ip: '104.16.249.249',
        port: 443,
        proto: 'TCP',
        rate: 1024,
      },
    },
    {
      appIndex: 1,
      domainIndex: 0,
      app: {
        n: 'SuspiciousProcess',
        c: '#e01b24',
        l: 'S',
        open: true,
        down: 2048,
        up: 1024,
        d: [],
      },
      domain: {
        n: 'malicious-domain.com',
        s: 'deny',
        down: 2048,
        up: 1024,
        sp: [],
        ip: '198.51.100.42',
        port: 8080,
        proto: 'TCP',
        rate: 2048,
      },
    },
  ];

  it('mounts with mock data and renders IP addresses and Block/Allow badges', () => {
    const handleSetRule = vi.fn();
    const handleSelect = vi.fn();

    const { container } = render(ConnectionTable, {
      props: {
        activeRows: mockRows,
        onSetRule: handleSetRule,
        onSelect: handleSelect,
      },
    });

    // Check IP addresses rendered
    expect(screen.getAllByText('104.16.249.249').length).toBeGreaterThan(0);
    expect(screen.getAllByText('198.51.100.42').length).toBeGreaterThan(0);

    // Check process names rendered
    expect(screen.getByText('Firefox')).toBeTruthy();
    expect(screen.getByText('SuspiciousProcess')).toBeTruthy();

    // Check Block and Allow badges / buttons
    const blockButtons = screen.getAllByTitle('Block connection');
    const allowButtons = screen.getAllByTitle('Allow connection');
    expect(blockButtons.length).toBe(2);
    expect(allowButtons.length).toBe(2);

    // Assert active status badges
    const allowedSwitch = container.querySelector('.sw.allow');
    const blockedSwitch = container.querySelector('.sw.deny');
    expect(allowedSwitch).toBeTruthy();
    expect(blockedSwitch).toBeTruthy();
    expect(allowedSwitch?.getAttribute('title')).toBe('Allowed');
    expect(blockedSwitch?.getAttribute('title')).toBe('Blocked');
  });
});
