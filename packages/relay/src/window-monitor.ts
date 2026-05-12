import { EventEmitter } from 'events';
import { CdpClient } from './cdp-client.js';
import {
  fetchCdpTargets,
  pickWorkbenchPages,
  parseWindowLabel,
  type CdpTargetListItem,
} from './targets.js';
import { EXTRACT_SCRIPT } from './dom/extract-inline.js';
import {
  clickApproveScript,
  clickRejectScript,
  sendPromptScript,
} from './dom/actions-inline.js';
import type { RelayConfig } from './config.js';
import type { RelayState, WindowSnapshot } from './types.js';

interface ExtractResult {
  workspaceTitle?: string;
  messages?: string[];
  pendingApproval?: boolean;
  pendingSnippet?: string;
  agentBusy?: boolean;
}

interface Session {
  target: CdpTargetListItem;
  client: CdpClient;
  snapshot?: ExtractResult;
  lastError?: string;
}

export class WindowMonitor extends EventEmitter {
  private config: RelayConfig;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private sessions = new Map<string, Session>();
  private latestMeta: { cdpReachable: boolean; cdpError?: string } = {
    cdpReachable: false,
  };

  constructor(config: RelayConfig) {
    super();
    this.config = config;
  }

  getState(): RelayState {
    return this.buildState();
  }

  start(): void {
    if (this.pollTimer) return;
    void this.tick();
    this.pollTimer = setInterval(() => void this.tick(), this.config.pollIntervalMs);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    for (const s of this.sessions.values()) {
      s.client.disconnect();
    }
    this.sessions.clear();
  }

  async approve(targetId: string): Promise<{ ok: boolean; detail?: string }> {
    const session = this.sessions.get(targetId);
    if (!session?.client.isConnected()) return { ok: false, detail: 'not_connected' };
    try {
      const res = (await session.client.evaluate(clickApproveScript())) as {
        ok?: boolean;
      };
      return { ok: !!res?.ok, detail: res?.ok ? undefined : 'no_button' };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  async reject(targetId: string): Promise<{ ok: boolean; detail?: string }> {
    const session = this.sessions.get(targetId);
    if (!session?.client.isConnected()) return { ok: false, detail: 'not_connected' };
    try {
      const res = (await session.client.evaluate(clickRejectScript())) as {
        ok?: boolean;
      };
      return { ok: !!res?.ok, detail: res?.ok ? undefined : 'no_button' };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  async sendPrompt(
    targetId: string,
    text: string
  ): Promise<{ ok: boolean; detail?: string }> {
    const session = this.sessions.get(targetId);
    if (!session?.client.isConnected()) return { ok: false, detail: 'not_connected' };
    try {
      const res = (await session.client.evaluate(sendPromptScript(text))) as {
        ok?: boolean;
        reason?: string;
      };
      return {
        ok: !!res?.ok,
        detail: res?.ok ? undefined : res?.reason ?? 'send_failed',
      };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  private async tick(): Promise<void> {
    let targets: CdpTargetListItem[] = [];
    try {
      targets = await fetchCdpTargets(this.config.cdpUrl);
      this.latestMeta = { cdpReachable: true };
    } catch (e) {
      this.latestMeta = {
        cdpReachable: false,
        cdpError: e instanceof Error ? e.message : String(e),
      };
      this.emit('state', this.buildState());
      return;
    }

    const pages = pickWorkbenchPages(targets);
    const seen = new Set<string>();

    for (const t of pages) {
      seen.add(t.id);
      let session = this.sessions.get(t.id);
      if (!session) {
        session = { target: t, client: new CdpClient() };
        this.sessions.set(t.id, session);
      }
      session.target = t;

      if (!session.client.isConnected() && t.webSocketDebuggerUrl) {
        try {
          await session.client.connect(t.webSocketDebuggerUrl);
          await session.client.send('Runtime.enable');
        } catch (e) {
          session.lastError = e instanceof Error ? e.message : String(e);
        }
      }

      if (session.client.isConnected()) {
        try {
          const raw = await session.client.evaluate(EXTRACT_SCRIPT);
          session.snapshot = normalizeSnapshot(t, raw);
          session.lastError = undefined;
        } catch (e) {
          session.lastError = e instanceof Error ? e.message : String(e);
        }
      }
    }

    for (const id of [...this.sessions.keys()]) {
      if (!seen.has(id)) {
        const s = this.sessions.get(id)!;
        s.client.disconnect();
        this.sessions.delete(id);
      }
    }

    this.emit('state', this.buildState());
  }

  private buildState(): RelayState {
    const windows: WindowSnapshot[] = [];
    for (const [id, session] of this.sessions) {
      const t = session.target;
      const snap = session.snapshot;
      windows.push({
        targetId: id,
        title: t.title,
        label: snap?.workspaceTitle || parseWindowLabel(t.title),
        workspaceTitle: snap?.workspaceTitle || '',
        messages: snap?.messages ?? [],
        pendingApproval: snap?.pendingApproval ?? false,
        pendingSnippet: snap?.pendingSnippet ?? '',
        agentBusy: snap?.agentBusy ?? false,
        connected: session.client.isConnected(),
        lastError: session.lastError,
      });
    }
    windows.sort((a, b) => a.label.localeCompare(b.label));
    return {
      cdpReachable: this.latestMeta.cdpReachable,
      cdpError: this.latestMeta.cdpError,
      windows,
      updatedAt: Date.now(),
    };
  }
}

function normalizeSnapshot(
  target: CdpTargetListItem,
  raw: unknown
): ExtractResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  return {
    workspaceTitle:
      typeof o.workspaceTitle === 'string'
        ? o.workspaceTitle
        : parseWindowLabel(target.title),
    messages: Array.isArray(o.messages)
      ? o.messages.filter((m): m is string => typeof m === 'string')
      : [],
    pendingApproval: !!o.pendingApproval,
    pendingSnippet:
      typeof o.pendingSnippet === 'string' ? o.pendingSnippet : '',
    agentBusy: !!o.agentBusy,
  };
}
