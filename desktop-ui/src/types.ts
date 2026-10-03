export type RuleStatus = 'allow' | 'deny' | 'mix';

export type FilterMode = 'all' | 'allow' | 'deny';

export type TimeRange =
  | 'Last Hour'
  | 'Today'
  | 'Yesterday'
  | 'Last 7 Days'
  | 'Last 30 Days';

export type TabMode = 'apps' | 'graph' | 'conn' | 'sum';

export type LayoutMode = 'wide' | 'mid' | 'compact';

export interface DomainConnection {
  n: string;
  s: 'allow' | 'deny';
  down: number;
  up: number;
  sp: number[];
  ip: string;
  port: number;
  proto: 'TCP' | 'UDP';
  rate: number;
}

export interface AppProcess {
  n: string;
  c: string;
  l: string;
  open: boolean;
  ext?: boolean;
  down: number;
  up: number;
  d: DomainConnection[];
  pid?: number;
}

export interface TrafficEventPayload {
  pid: number;
  process_name: string;
  destination_ip: string;
  destination_port: number;
  protocol: string;
  bytes_sent: number;
  bytes_received: number;
  action: string;
}

export interface DaemonStatusPayload {
  connected: boolean;
  endpoint?: string;
  error?: string | null;
}

export interface SelectionState {
  a: number;
  d: number | null;
}

export interface ActiveTableRow {
  app: AppProcess;
  appIndex: number;
  domain: DomainConnection;
  domainIndex: number;
}

export interface ProcessSummaryItem {
  name: string;
  color: string;
  letter: string;
  down: number;
  up: number;
}

export interface DomainSummaryItem {
  name: string;
  down: number;
  up: number;
}
