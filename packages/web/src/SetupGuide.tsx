import type { ReactNode } from 'react';

const steps: { title: string; body: ReactNode }[] = [
  {
    title: 'Launch Cursor with remote debugging',
    body: (
      <>
        Fully quit Cursor, then start it with CDP enabled so the relay can read the agent
        sidebar. On macOS:{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-emerald-200/95">
          open -a Cursor --args --remote-debugging-port=9222
        </code>
        . On Windows or Linux, add the same flag to your Cursor shortcut or terminal launcher.
        Check{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">
          http://127.0.0.1:9222/json/version
        </code>{' '}
        in a browser on that machine — it should return JSON.
      </>
    ),
  },
  {
    title: 'Run the relay on that same machine',
    body: (
      <>
        In the{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">cursor-remote-cursor</code>{' '}
        repo:{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">npm install</code>,{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">npm run build</code>, then{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">npm start</code>. The relay
        listens on{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">http://127.0.0.1:3847</code>{' '}
        by default. Your code never leaves this computer — the relay only mirrors what you
        already see in the IDE.
      </>
    ),
  },
  {
    title: 'Get the relay password',
    body: (
      <>
        The first time you start the relay, it prints a random password and saves it to{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">
          packages/relay/data/.relay-password
        </code>
        . You can also set <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">RELAY_PASSWORD</code>{' '}
        in <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">packages/relay/.env</code>.
      </>
    ),
  },
  {
    title: 'Reach the relay from your phone (if needed)',
    body: (
      <>
        If you opened this page from the same computer as the relay, you can leave{' '}
        <strong className="text-[#e6edf3]">Relay base URL</strong> empty. If you use a hosted URL
        (for example Vercel), your phone must reach the relay over Tailscale, a LAN IP, Cloudflare
        Tunnel, ngrok, or similar. Set{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">SERVER_HOST=0.0.0.0</code>{' '}
        only when you understand the network exposure, and use a long random password.
      </>
    ),
  },
  {
    title: 'Sign in below',
    body: (
      <>
        Paste your <strong className="text-[#e6edf3]">Relay base URL</strong> (no trailing slash)
        if you are not on localhost, then enter the relay password and tap{' '}
        <strong className="text-[#e6edf3]">Connect</strong>. You should see live window status and
        conversation snippets when Agent chat is open in Cursor.
      </>
    ),
  },
  {
    title: 'Approve, reject, and prompt',
    body: (
      <>
        When a tool run needs confirmation, use <strong className="text-[#e6edf3]">Approve / Run</strong>{' '}
        or <strong className="text-[#e6edf3]">Reject</strong>. Use <strong className="text-[#e6edf3]">Send to agent</strong>{' '}
        for follow-up instructions. If something stops matching Cursor’s UI after an update,
        update the DOM selectors in the relay package and rebuild.
      </>
    ),
  },
];

export function SetupGuide(): React.JSX.Element {
  return (
    <section
      className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b22]/90 p-5 shadow-xl backdrop-blur-sm"
      aria-labelledby="setup-guide-heading"
    >
      <h2
        id="setup-guide-heading"
        className="mb-1 text-center text-lg font-semibold tracking-tight text-white"
      >
        Step-by-step setup
      </h2>
      <p className="mb-5 text-center text-sm leading-relaxed text-[#8b949e]">
        Control your local Cursor from this page. Do these steps once on your dev machine, then
        connect from any phone browser.
      </p>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600/25 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[#e6edf3]">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#8b949e]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
