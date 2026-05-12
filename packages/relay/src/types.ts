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
  /** Total entries returned by CDP /json/list */
  targetCount: number;
  /** Page-type targets with a debugger WebSocket URL (candidates we try to attach to) */
  pageTargetCount: number;
}

export interface RelayState {
  cdpReachable: boolean;
  cdpError?: string;
  /** Present when CDP HTTP succeeded; helps explain empty window lists */
  diagnostics?: RelayDiagnostics;
  windows: WindowSnapshot[];
  updatedAt: number;
}
