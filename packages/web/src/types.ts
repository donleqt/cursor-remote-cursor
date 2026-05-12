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

export interface RelayState {
  cdpReachable: boolean;
  cdpError?: string;
  windows: WindowSnapshot[];
  updatedAt: number;
}
