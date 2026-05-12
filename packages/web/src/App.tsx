import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RelayState } from './types';

const TOKEN_KEY = 'crc_token';

function loadToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(t: string): void {
  sessionStorage.setItem(TOKEN_KEY, t);
}

export function App(): React.ReactElement {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(() => loadToken());
  const [loginError, setLoginError] = useState<string | null>(null);
  const [state, setState] = useState<RelayState | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [promptText, setPromptText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {
    const wins = state?.windows ?? [];
    if (!wins.length) return;
    const still = pick && wins.some(w => w.targetId === pick);
    if (!still) setPick(wins[0]!.targetId);
  }, [state?.windows, pick]);

  const selectedId = pick ?? '';

  useEffect(() => {
    if (!token) return;

    const s = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
    });

    s.on('connect_error', () => {
      setLoginError('Could not connect — check relay is running and password.');
    });

    s.on('state', (payload: RelayState) => setState(payload));

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.close();
      setSocket(null);
    };
  }, [token]);

  const login = useCallback(async () => {
    setLoginError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string };
      if (!res.ok || !data.ok || !data.token) {
        setLoginError('Invalid password.');
        return;
      }
      saveToken(data.token);
      setToken(data.token);
    } catch {
      setLoginError('Network error.');
    }
  }, [password]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setState(null);
  }, []);

  const runAck = useCallback(
    (label: string, promise: Promise<unknown>) => {
      setBusy(label);
      promise.finally(() => setBusy(null));
    },
    []
  );

  if (!token) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161b22] p-6 shadow-xl">
          <div className="mb-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#8b949e]">
            Cursor Remote
          </div>
          <h1 className="mb-1 text-center text-xl font-semibold text-white">
            Sign in
          </h1>
          <p className="mb-6 text-center text-sm text-[#8b949e]">
            Enter the relay password from your computer (terminal output or extension).
          </p>
          <label className="mb-2 block text-xs text-[#8b949e]">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 focus:ring-2"
            placeholder="••••••••"
          />
          {loginError && (
            <p className="mb-3 text-center text-sm text-rose-400">{loginError}</p>
          )}
          <button
            type="button"
            onClick={() => void login()}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-500 active:scale-[0.99]"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  const active =
    state?.windows.find(w => w.targetId === selectedId) ?? state?.windows[0];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d1117]/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400/90">
            Live
          </div>
          <div className="text-sm font-semibold text-white">Cursor Remote</div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-[#8b949e] hover:border-white/25 hover:text-white"
        >
          Sign out
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-4 pb-24">
        {!state?.cdpReachable && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="font-semibold">CDP unreachable</div>
            <p className="mt-1 text-amber-100/90">
              Start Cursor with{' '}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                --remote-debugging-port=9222
              </code>{' '}
              and confirm{' '}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                http://127.0.0.1:9222/json/version
              </code>{' '}
              on the machine running the relay.
            </p>
            {state?.cdpError && (
              <p className="mt-2 text-xs text-amber-200/80">{state.cdpError}</p>
            )}
          </div>
        )}

        {state && state.windows.length > 1 && (
          <label className="block rounded-2xl border border-white/10 bg-[#161b22] p-3">
            <span className="mb-2 block text-xs uppercase tracking-wide text-[#8b949e]">
              Cursor window
            </span>
            <select
              value={selectedId}
              onChange={e => setPick(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
            >
              {state.windows.map(w => (
                <option key={w.targetId} value={w.targetId}>
                  {w.label}
                  {w.pendingApproval ? ' · needs approval' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {active && (
          <section className="rounded-2xl border border-white/10 bg-[#161b22] p-4 shadow-inner">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-[#8b949e]">
                  Window
                </div>
                <div className="text-lg font-semibold text-white">
                  {active.label || active.workspaceTitle || 'Workspace'}
                </div>
                <div className="mt-1 text-xs text-[#8b949e]">
                  {active.connected ? (
                    <span className="text-emerald-400">● Connected</span>
                  ) : (
                    <span className="text-rose-400">○ Disconnected</span>
                  )}
                  {active.agentBusy && (
                    <span className="ml-2 text-sky-300">Agent busy…</span>
                  )}
                </div>
              </div>
              {active.pendingApproval && (
                <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  Needs approval
                </span>
              )}
            </div>

            {active.pendingApproval && active.pendingSnippet && (
              <div className="mb-4 rounded-xl bg-black/35 px-3 py-2 text-xs text-[#c9d1d9]">
                {active.pendingSnippet}
              </div>
            )}

            {active.pendingApproval && (
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  disabled={!socket || !!busy}
                  onClick={() =>
                    socket &&
                    runAck(
                      'approve',
                      new Promise(resolve => {
                        socket.emit(
                          'approve',
                          { targetId: active.targetId },
                          resolve
                        );
                      })
                    )
                  }
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-40"
                >
                  {busy === 'approve' ? 'Running…' : 'Approve / Run'}
                </button>
                <button
                  type="button"
                  disabled={!socket || !!busy}
                  onClick={() =>
                    socket &&
                    runAck(
                      'reject',
                      new Promise(resolve => {
                        socket.emit(
                          'reject',
                          { targetId: active.targetId },
                          resolve
                        );
                      })
                    )
                  }
                  className="flex-1 rounded-xl border border-white/15 bg-transparent py-3 text-sm font-semibold text-[#e6edf3] hover:bg-white/5 disabled:opacity-40"
                >
                  {busy === 'reject' ? 'Running…' : 'Reject'}
                </button>
              </div>
            )}

            <div className="mb-2 text-xs uppercase tracking-wide text-[#8b949e]">
              Conversation
            </div>
            <div className="max-h-[42vh] space-y-2 overflow-y-auto rounded-xl bg-black/25 p-3 text-sm leading-relaxed">
              {active.messages.length === 0 && (
                <p className="text-[#8b949e]">
                  No messages captured yet — open Agent chat in Cursor for this window.
                </p>
              )}
              {active.messages.map((m, i) => (
                <div
                  key={`${i}-${m.slice(0, 24)}`}
                  className="rounded-lg border border-white/5 bg-[#0d1117]/80 px-3 py-2 text-[#c9d1d9]"
                >
                  {m}
                </div>
              ))}
            </div>
            {active.lastError && (
              <p className="mt-2 text-xs text-rose-400">{active.lastError}</p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#161b22] p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-[#8b949e]">
            Send prompt
          </div>
          <textarea
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            rows={3}
            placeholder="Follow-up instruction for the agent…"
            className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
          />
          <button
            type="button"
            disabled={!socket || !active || !promptText.trim() || !!busy}
            onClick={() =>
              socket &&
              active &&
              runAck(
                'prompt',
                new Promise(resolve => {
                  socket.emit(
                    'prompt',
                    { targetId: active.targetId, text: promptText },
                    () => {
                      setPromptText('');
                      resolve(null);
                    }
                  );
                })
              )
            }
            className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow hover:bg-sky-500 disabled:opacity-40"
          >
            {busy === 'prompt' ? 'Sending…' : 'Send to agent'}
          </button>
        </section>

        <footer className="mt-auto text-center text-[10px] text-[#6e7681]">
          Updated {state ? new Date(state.updatedAt).toLocaleTimeString() : '—'} · Your code
          stays on the machine running Cursor.
        </footer>
      </main>
    </div>
  );
}
