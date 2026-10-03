import type { AppProcess, DomainConnection, TimeRange, RuleStatus, TrafficEventPayload } from './types';

let seed = 11;
export const randomFloat = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

export const fmt = (b: number): string => {
  if (isNaN(b) || b < 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1000 && i < 4) {
    b /= 1000;
    i++;
  }
  return (b >= 100 || !i ? b.toFixed(0) : b >= 10 ? b.toFixed(1) : b.toFixed(2)) + ' ' + u[i];
};

const RAW_APPS: [string, string, string, string[]][] = [
  ['Firefox', '#e8590c', 'F', ['youtube.com', 'googlevideo.com', 'github.com', 'fastly.net', 'mozilla.org']],
  ['Spotify', '#1db954', 'S', ['spotify.com', 'scdn.co', 'akamaized.net']],
  ['Discord', '#5865f2', 'D', ['discord.com', 'discordapp.net', 'cloudflare.com']],
  ['Steam', '#1b6f9a', 'S', ['steampowered.com', 'steamcontent.com']],
  ['Thunderbird', '#2b6cb0', 'T', ['imap.gmail.com', 'smtp.gmail.com']],
  ['apt', '#b4234f', 'A', ['archive.ubuntu.com', 'security.ubuntu.com']],
  ['Flatpak', '#4a86cf', 'F', ['dl.flathub.org', 'flathub.org']],
  ['systemd-resolved', '#6b7280', 'R', ['1.1.1.1', '9.9.9.9']]
];

export const TIME_RANGES: TimeRange[] = [
  'Last Hour',
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 30 Days'
];

export const RANGE_MULTIPLIER: Record<TimeRange, number> = {
  'Last Hour': 1,
  'Today': 1.8,
  'Yesterday': 1.4,
  'Last 7 Days': 2.6,
  'Last 30 Days': 3.4
};

export const RANGE_LABELS: Record<TimeRange, string[]> = {
  'Last Hour': ['-60m', '-45m', '-30m', '-15m', 'now'],
  'Today': ['00:00', '06:00', '12:00', '18:00', 'now'],
  'Yesterday': ['00:00', '06:00', '12:00', '18:00', '24:00'],
  'Last 7 Days': ['Mon', 'Wed', 'Fri', 'Sun', 'Today'],
  'Last 30 Days': ['Sep 3', 'Sep 10', 'Sep 17', 'Sep 24', 'Today']
};

export function createInitialApps(): AppProcess[] {
  const apps: AppProcess[] = RAW_APPS.map(([n, c, l, ds], ai) => {
    const domains: DomainConnection[] = ds.map((domainName, i) => {
      const down = Math.pow(randomFloat(), 2) * 30e9 + 2e7;
      const up = Math.pow(randomFloat(), 2) * 3e9 + 1e6;
      const status: 'allow' | 'deny' = (ai + i) % 5 === 3 ? 'deny' : 'allow';
      const sp = Array.from({ length: 10 }, () => Math.floor(8 + randomFloat() * 92));
      const ip = [
        104 + Math.floor(randomFloat() * 60),
        Math.floor(randomFloat() * 250),
        Math.floor(randomFloat() * 250),
        1 + Math.floor(randomFloat() * 250)
      ].join('.');
      const port = [443, 443, 443, 80, 993, 587, 53][(ai + i) % 7];
      const proto: 'TCP' | 'UDP' = (ai + i) % 7 === 6 ? 'UDP' : 'TCP';
      const rate = Math.pow(randomFloat(), 2) * 4e6 + 2e3;

      return {
        n: domainName,
        s: status,
        down,
        up,
        sp,
        ip,
        port,
        proto,
        rate
      };
    });

    const totalDown = domains.reduce((sum, d) => sum + d.down, 0);
    const totalUp = domains.reduce((sum, d) => sum + d.up, 0);

    return {
      n,
      c,
      l,
      open: ai === 0,
      down: totalDown,
      up: totalUp,
      d: domains,
      ext: ai === 2 || ai === 6 // Discord and Flatpak marked as EXT
    };
  });

  return apps;
}

export function getAppStatus(app: AppProcess): RuleStatus {
  if (app.d.every(d => d.s === 'allow')) return 'allow';
  if (app.d.every(d => d.s === 'deny')) return 'deny';
  return 'mix';
}

export function generateGraphData(range: TimeRange): { download: number[]; upload: number[] } {
  let a = 0.4;
  let b = 0.2;
  const download: number[] = [];
  const upload: number[] = [];
  const mult = RANGE_MULTIPLIER[range];

  for (let i = 0; i < 96; i++) {
    a = Math.min(1, Math.max(0.03, a + (randomFloat() - 0.5) * 0.55));
    b = Math.min(1, Math.max(0.02, b + (randomFloat() - 0.5) * 0.4));
    download.push(a * (randomFloat() < 0.08 ? 1.7 : 1) * mult * 2.2e6);
    upload.push(b * (randomFloat() < 0.08 ? 1.8 : 1) * mult * 1.1e6);
  }

  return { download, upload };
}

export function stepGraphData(
  download: number[],
  upload: number[]
): { download: number[]; upload: number[] } {
  const newDown = [...download];
  const newUp = [...upload];

  const lastDown = newDown[newDown.length - 1];
  const lastUp = newUp[newUp.length - 1];

  newDown.push(lastDown * (0.7 + randomFloat() * 0.6) + 1e5);
  newUp.push(lastUp * (0.7 + randomFloat() * 0.6) + 2e4);
  newDown.shift();
  newUp.shift();

  return { download: newDown, upload: newUp };
}

export function agg(a: number[], n: number): number[] {
  if (a.length === 0) return Array(n).fill(0);
  const k = a.length / n;
  return Array.from({ length: n }, (_, i) => {
    let t = 0;
    for (let j = 0; j < k; j++) {
      t += a[Math.floor(i * k + j)] || 0;
    }
    return t / k;
  });
}

const PALETTE = [
  '#e8590c', '#1db954', '#5865f2', '#1b6f9a', '#2b6cb0',
  '#b4234f', '#4a86cf', '#6b7280', '#059669', '#d97706',
  '#7c3aed', '#db2777', '#0891b2', '#ea580c'
];

export function getProcessColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

export function handleIncomingTrafficEvent(
  apps: AppProcess[],
  event: TrafficEventPayload
): AppProcess[] {
  const processName = event.process_name?.trim() || `PID:${event.pid}`;
  const ruleStatus: 'allow' | 'deny' =
    event.action.toUpperCase() === 'BLOCK' ? 'deny' : 'allow';
  const proto: 'TCP' | 'UDP' =
    event.protocol.toUpperCase() === 'UDP' ? 'UDP' : 'TCP';
  const rate = event.bytes_sent + event.bytes_received;

  const nextApps = [...apps];
  const appIndex = nextApps.findIndex(
    (a) => a.n.toLowerCase() === processName.toLowerCase()
  );

  if (appIndex === -1) {
    const newApp: AppProcess = {
      n: processName,
      c: getProcessColor(processName),
      l: processName.charAt(0).toUpperCase() || 'P',
      open: true,
      down: event.bytes_received,
      up: event.bytes_sent,
      pid: event.pid,
      d: [
        {
          n: `${event.destination_ip}:${event.destination_port}`,
          s: ruleStatus,
          down: event.bytes_received,
          up: event.bytes_sent,
          sp: [10, 20, 35, 25, 45],
          ip: event.destination_ip,
          port: event.destination_port,
          proto,
          rate
        }
      ]
    };
    nextApps.unshift(newApp);
    return nextApps;
  }

  const app = { ...nextApps[appIndex], d: [...nextApps[appIndex].d] };
  app.down += event.bytes_received;
  app.up += event.bytes_sent;
  if (event.pid) {
    app.pid = event.pid;
  }

  const connIndex = app.d.findIndex(
    (c) => c.ip === event.destination_ip && c.port === event.destination_port
  );

  if (connIndex === -1) {
    app.d.unshift({
      n: `${event.destination_ip}:${event.destination_port}`,
      s: ruleStatus,
      down: event.bytes_received,
      up: event.bytes_sent,
      sp: [10, 25, 40, 30, 50],
      ip: event.destination_ip,
      port: event.destination_port,
      proto,
      rate
    });
  } else {
    const existingConn = { ...app.d[connIndex] };
    existingConn.down += event.bytes_received;
    existingConn.up += event.bytes_sent;
    existingConn.rate = rate > 0 ? rate : existingConn.rate;
    existingConn.s = ruleStatus;

    const nextSp = [...existingConn.sp];
    const spVal = Math.min(100, Math.max(10, Math.floor(existingConn.rate / 1024) % 100));
    nextSp.push(spVal || 20);
    if (nextSp.length > 10) nextSp.shift();
    existingConn.sp = nextSp;
    app.d[connIndex] = existingConn;
  }

  nextApps[appIndex] = app;
  return nextApps;
}

