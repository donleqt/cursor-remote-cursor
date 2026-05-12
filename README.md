# Cursor Remote (Cursor)

Control your **local Cursor IDE** from any phone browser: approve tool runs, watch the agent conversation, and send prompts. Your repository and chat stay on your machine; this project only relays what you already see in the IDE UI.

## How it works

1. Launch Cursor with Chrome DevTools Protocol enabled (`--remote-debugging-port=9222`).
2. Run the **relay server** on your dev machine. It connects to Cursor over CDP and reads the agent sidebar DOM (same approach as other self-hosted remote controllers).
3. Open the **mobile web client** on your LAN or over Tailscale/VPN, authenticate with the shared password, and control the session.

There is no cloud service, no telemetry, and no license check—MIT licensed.

## Quick start

### 1. Cursor with CDP

**macOS**

```bash
open -a Cursor --args --remote-debugging-port=9222
```

**Windows** (PowerShell)

```powershell
& "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe" --remote-debugging-port=9222
```

**Linux**

```bash
cursor --remote-debugging-port=9222
```

Verify: `http://127.0.0.1:9222/json/version` should return JSON.

### 2. Install and run the relay

```bash
git clone https://github.com/donleqt/cursor-remote-cursor.git
cd cursor-remote-cursor
npm install
npm run build
```

Create `.env` in `packages/relay` (optional):

```env
CDP_URL=http://127.0.0.1:9222
SERVER_HOST=127.0.0.1
SERVER_PORT=3847
RELAY_PASSWORD=change-me-to-a-long-random-string
POLL_INTERVAL_MS=400
```

```bash
npm start
```

Open `http://127.0.0.1:3847`, enter the password (defaults to auto-generated on first run — printed in the console), and connect.

### 3. Phone access

- **Same Wi‑Fi:** set `SERVER_HOST=0.0.0.0`, use your computer’s LAN IP from the phone.
- **Remote:** use [Tailscale](https://tailscale.com/) on PC + phone and bind `SERVER_HOST=100.x.y.z` or `0.0.0.0` on the Tailscale interface.

## VS Code / Cursor extension (optional)

Install the bundled `.vsix` from Releases, or build:

```bash
npm run build
cd packages/extension && npx vsce package --no-dependencies
```

The extension can start/stop the relay and copy the web URL + password.

Settings prefix: `cursorRemoteCursor.*`

## Security

- Default bind is **localhost**. Opening `0.0.0.0` exposes the relay to your network—use a strong `RELAY_PASSWORD` and prefer Tailscale over port forwarding.
- The relay does **not** upload your code; it mirrors UI state via local CDP.

## Limitations

- Cursor’s DOM changes between releases. If approval buttons stop matching, update selectors in `packages/relay/src/dom/extract.ts` or open an issue with a screenshot.
- “Approve” maps to clicking the same buttons you would click in the sidebar; exotic dialogs may still need the desktop.

## License

MIT — see [LICENSE](LICENSE).
