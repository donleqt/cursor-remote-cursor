export interface CdpTargetListItem {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export async function fetchCdpTargets(cdpBaseUrl: string): Promise<CdpTargetListItem[]> {
  const url = `${cdpBaseUrl.replace(/\/$/, '')}/json/list`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CDP ${url} -> ${res.status}`);
  }
  return (await res.json()) as CdpTargetListItem[];
}

export function parseWindowLabel(title: string): string {
  let t = title;
  const suf = ' - Cursor';
  if (t.endsWith(suf)) t = t.slice(0, -suf.length);
  const parts = t.split(' - ');
  if (parts.length >= 2) return parts[parts.length - 2]?.trim() || t.trim();
  return t.trim();
}

export function pickWorkbenchPages(targets: CdpTargetListItem[]): CdpTargetListItem[] {
  const pages = targets.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
  const workbench = pages.filter(
    t => t.url.includes('workbench') || t.title.toLowerCase().includes('cursor')
  );
  return workbench.length ? workbench : pages;
}
