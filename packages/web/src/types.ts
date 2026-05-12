export interface WindowSnapshot {
  targetId: string;
  title: string;
  label: string;
  workspaceTitle: string;
  messages: string[];
  pendingApproval: boolean;
  pendingSnippet: string;
  agentBusy: boolean;
  connected: boolean;
  lastError?: string;
}

export interface RelayDiagnostics {
  targetCount: number;
  pageTargetCount: number;
}

export interface RelayState {
  cdpReachable: boolean;
  cdpError?: string;
  diagnostics?: RelayDiagnostics;
  windows: WindowSnapshot[];
  updatedAt: number;
}
