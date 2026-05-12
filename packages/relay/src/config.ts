import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface RelayConfig {
  cdpUrl: string;
  serverHost: string;
  serverPort: number;
  relayPassword: string;
  pollIntervalMs: number;
  logLevel: string;
  staticDir: string | null;
  dataDir: string;
}

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v !== undefined && v !== '' ? v : fallback;
}

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ensurePassword(dataDir: string): string {
  const path = join(dataDir, '.relay-password');
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8').trim();
  }
  const pw = crypto.randomBytes(18).toString('base64url');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path, `${pw}\n`, { mode: 0o600 });
  return pw;
}

export function loadConfig(): RelayConfig {
  const root = join(__dirname, '..');
  const dataDir = env('DATA_DIR', join(root, 'data'));

  const relayPassword =
    env('RELAY_PASSWORD', '') || ensurePassword(dataDir);

  const staticCandidate = join(root, 'static');
  const staticDir = existsSync(join(staticCandidate, 'index.html'))
    ? staticCandidate
    : null;

  return {
    cdpUrl: env('CDP_URL', 'http://127.0.0.1:9222'),
    serverHost: env('SERVER_HOST', '127.0.0.1'),
    serverPort: envNum('SERVER_PORT', 3847),
    relayPassword,
    pollIntervalMs: envNum('POLL_INTERVAL_MS', 400),
    logLevel: env('LOG_LEVEL', 'info'),
    staticDir,
    dataDir,
  };
}
