export type RuleStatus = 'allow' | 'deny' | 'mix';

export type FilterMode = 'all' | 'allow' | 'deny';

export type TimeRange =
  | 'Last Hour'
  | 'Today'
  | 'Yesterday'
  | 'Last 7 Days'
  | 'Last 30 Days';

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
