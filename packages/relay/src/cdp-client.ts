import { WebSocket } from 'ws';

export interface CdpMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

interface Pending {
  resolve: (v: Record<string, unknown>) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 15000;

export class CdpClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private connected = false;

  async connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.on('open', () => {
        this.connected = true;
        resolve();
      });
      this.ws.on('error', err => {
        if (!this.connected) reject(err instanceof Error ? err : new Error(String(err)));
      });
      this.ws.on('message', data => {
        this.handleMessage(data.toString());
      });
      this.ws.on('close', () => {
        this.connected = false;
        this.rejectAll(new Error('CDP WebSocket closed'));
      });
    });
  }

  disconnect(): void {
    this.connected = false;
    this.rejectAll(new Error('CDP disconnect'));
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<Record<string, unknown>> {
    if (!this.ws || !this.connected) {
      throw new Error('CDP client not connected');
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
    const result = await this.send(
      'Runtime.evaluate',
      {
        expression,
        returnByValue: true,
        awaitPromise: true,
      },
      timeoutMs
    );

    const exceptionDetails = result.exceptionDetails as
      | { text?: string; exception?: { description?: string } }
      | undefined;
    if (exceptionDetails) {
      const msg =
        exceptionDetails.exception?.description ??
        exceptionDetails.text ??
        'Runtime.evaluate failed';
      throw new Error(msg);
    }
    const remote = result.result as { value?: unknown } | undefined;
    return remote?.value;
  }

  private handleMessage(raw: string): void {
    let msg: CdpMessage;
    try {
      msg = JSON.parse(raw) as CdpMessage;
    } catch {
      return;
    }
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!;
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      if (msg.error) {
        p.reject(new Error(msg.error.message ?? 'CDP error'));
      } else if (msg.result) {
        p.resolve(msg.result);
      } else {
        p.reject(new Error('CDP empty response'));
      }
    }
  }

  private rejectAll(err: Error): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
  }
}
