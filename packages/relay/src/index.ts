import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();
import { WindowMonitor } from './window-monitor.js';
import { createRelayApp } from './http-relay.js';

function log(cfg: ReturnType<typeof loadConfig>, msg: string): void {
  if (cfg.logLevel === 'silent') return;
  console.log(msg);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const monitor = new WindowMonitor(config);
  const { httpServer } = createRelayApp(config, monitor);

  monitor.start();

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(config.serverPort, config.serverHost, () => resolve());
    httpServer.on('error', reject);
  });

  log(
    config,
    `\n[cursor-remote-cursor] Relay listening on http://${config.serverHost}:${config.serverPort}`
  );
  if (!process.env.RELAY_PASSWORD) {
    log(
      config,
      `[cursor-remote-cursor] Password (also in ${config.dataDir}/.relay-password):\n${config.relayPassword}\n`
    );
  }
  log(config, `[cursor-remote-cursor] CDP: ${config.cdpUrl}`);
}

main().catch(err => {
  console.error('[cursor-remote-cursor] Fatal:', err);
  process.exit(1);
});
