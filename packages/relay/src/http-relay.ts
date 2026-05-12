import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RelayConfig } from './config.js';
import { WindowMonitor } from './window-monitor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createRelayApp(config: RelayConfig, monitor: WindowMonitor) {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.post('/api/login', (req, res) => {
    const pw = typeof req.body?.password === 'string' ? req.body.password : '';
    if (pw === config.relayPassword) {
      res.json({ ok: true, token: issueToken(config.relayPassword) });
    } else {
      res.status(401).json({ ok: false });
    }
  });

  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use((socket, next) => {
    const token =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : '';
    if (!token || !verifyToken(token, config.relayPassword)) {
      next(new Error('unauthorized'));
      return;
    }
    next();
  });

  monitor.on('state', () => {
    io.emit('state', monitor.getState());
  });

  io.on('connection', socket => {
    socket.emit('state', monitor.getState());

    socket.on(
      'approve',
      async (payload: { targetId?: string }, ack?: (r: unknown) => void) => {
        const id = typeof payload?.targetId === 'string' ? payload.targetId : '';
        const result = id ? await monitor.approve(id) : { ok: false, detail: 'bad_id' };
        ack?.(result);
      }
    );

    socket.on(
      'reject',
      async (payload: { targetId?: string }, ack?: (r: unknown) => void) => {
        const id = typeof payload?.targetId === 'string' ? payload.targetId : '';
        const result = id ? await monitor.reject(id) : { ok: false, detail: 'bad_id' };
        ack?.(result);
      }
    );

    socket.on(
      'prompt',
      async (
        payload: { targetId?: string; text?: string },
        ack?: (r: unknown) => void
      ) => {
        const id = typeof payload?.targetId === 'string' ? payload.targetId : '';
        const text = typeof payload?.text === 'string' ? payload.text : '';
        if (!id || !text.trim()) {
          ack?.({ ok: false, detail: 'bad_payload' });
          return;
        }
        const result = await monitor.sendPrompt(id, text);
        ack?.(result);
      }
    );
  });

  if (config.staticDir) {
    const webRoot = config.staticDir;
    app.use(express.static(webRoot));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webRoot, 'index.html'));
    });
  }

  return { app, httpServer, io };
}

function issueToken(secret: string): string {
  const payload = Buffer.from(`${Date.now()}:${secret}`, 'utf-8').toString('base64url');
  return payload;
}

function verifyToken(token: string, secret: string): boolean {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const idx = raw.indexOf(':');
    if (idx <= 0) return false;
    const ts = Number(raw.slice(0, idx));
    const rest = raw.slice(idx + 1);
    if (!Number.isFinite(ts) || rest !== secret) return false;
    if (Date.now() - ts > 1000 * 60 * 60 * 24 * 14) return false;
    return true;
  } catch {
    return false;
  }
}
