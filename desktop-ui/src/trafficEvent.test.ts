import { describe, it, expect } from 'vitest';
import { getProcessColor, handleIncomingTrafficEvent } from './mockData';
import type { AppProcess, TrafficEventPayload } from './types';

describe('Traffic Event Ingestion & State Updating', () => {
  it('deterministically calculates process badge colors', () => {
    const color1 = getProcessColor('firefox');
    const color2 = getProcessColor('firefox');
    const color3 = getProcessColor('curl');

    expect(color1).toBe(color2);
    expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
    expect(color3).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('inserts a new process when an unknown process event is received', () => {
    const initialApps: AppProcess[] = [];
    const event: TrafficEventPayload = {
      pid: 12345,
      process_name: 'curl',
      destination_ip: '93.184.216.34',
      destination_port: 443,
      protocol: 'TCP',
      bytes_sent: 250,
      bytes_received: 1024,
      action: 'ALLOW',
    };

    const updated = handleIncomingTrafficEvent(initialApps, event);

    expect(updated.length).toBe(1);
    expect(updated[0].n).toBe('curl');
    expect(updated[0].l).toBe('C');
    expect(updated[0].pid).toBe(12345);
    expect(updated[0].down).toBe(1024);
    expect(updated[0].up).toBe(250);
    expect(updated[0].d.length).toBe(1);
    expect(updated[0].d[0].ip).toBe('93.184.216.34');
    expect(updated[0].d[0].port).toBe(443);
    expect(updated[0].d[0].proto).toBe('TCP');
    expect(updated[0].d[0].s).toBe('allow');
    expect(updated[0].d[0].rate).toBe(1274);
  });

  it('handles BLOCK actions and sets rule to deny', () => {
    const initialApps: AppProcess[] = [];
    const event: TrafficEventPayload = {
      pid: 9999,
      process_name: 'malware',
      destination_ip: '198.51.100.1',
      destination_port: 8080,
      protocol: 'TCP',
      bytes_sent: 100,
      bytes_received: 0,
      action: 'BLOCK',
    };

    const updated = handleIncomingTrafficEvent(initialApps, event);

    expect(updated[0].d[0].s).toBe('deny');
  });

  it('appends a new connection to an existing process', () => {
    const initialApps: AppProcess[] = [
      {
        n: 'curl',
        c: '#ff0000',
        l: 'C',
        open: true,
        down: 500,
        up: 100,
        d: [
          {
            n: '1.1.1.1:53',
            s: 'allow',
            down: 500,
            up: 100,
            sp: [10],
            ip: '1.1.1.1',
            port: 53,
            proto: 'UDP',
            rate: 600,
          },
        ],
      },
    ];

    const event: TrafficEventPayload = {
      pid: 5432,
      process_name: 'curl',
      destination_ip: '1.0.0.1',
      destination_port: 53,
      protocol: 'UDP',
      bytes_sent: 50,
      bytes_received: 200,
      action: 'ALLOW',
    };

    const updated = handleIncomingTrafficEvent(initialApps, event);

    expect(updated.length).toBe(1);
    expect(updated[0].d.length).toBe(2);
    expect(updated[0].down).toBe(700);
    expect(updated[0].up).toBe(150);
  });

  it('updates existing connection data and sparkline on subsequent events', () => {
    const initialApps: AppProcess[] = [
      {
        n: 'wget',
        c: '#123456',
        l: 'W',
        open: true,
        down: 1000,
        up: 200,
        d: [
          {
            n: '10.0.0.1:80',
            s: 'allow',
            down: 1000,
            up: 200,
            sp: [10, 20],
            ip: '10.0.0.1',
            port: 80,
            proto: 'TCP',
            rate: 1200,
          },
        ],
      },
    ];

    const event: TrafficEventPayload = {
      pid: 2222,
      process_name: 'wget',
      destination_ip: '10.0.0.1',
      destination_port: 80,
      protocol: 'TCP',
      bytes_sent: 300,
      bytes_received: 2000,
      action: 'ALLOW',
    };

    const updated = handleIncomingTrafficEvent(initialApps, event);

    expect(updated[0].down).toBe(3000);
    expect(updated[0].up).toBe(500);
    expect(updated[0].d.length).toBe(1);
    expect(updated[0].d[0].down).toBe(3000);
    expect(updated[0].d[0].up).toBe(500);
    expect(updated[0].d[0].rate).toBe(2300);
    expect(updated[0].d[0].sp.length).toBe(3);
  });

  it('handles empty process name by falling back to PID', () => {
    const initialApps: AppProcess[] = [];
    const event: TrafficEventPayload = {
      pid: 7777,
      process_name: '',
      destination_ip: '8.8.8.8',
      destination_port: 53,
      protocol: 'UDP',
      bytes_sent: 60,
      bytes_received: 120,
      action: 'ALLOW',
    };

    const updated = handleIncomingTrafficEvent(initialApps, event);

    expect(updated[0].n).toBe('PID:7777');
    expect(updated[0].l).toBe('P');
  });
});
