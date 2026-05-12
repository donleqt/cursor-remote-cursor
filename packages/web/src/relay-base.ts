const STORAGE_KEY = 'crc_relay_base';

function normalizeBase(url: string): string {
  return url.replace(/\/$/, '');
}

export function getRelayBaseUrl(): string {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null) {
      return normalizeBase(localStorage.getItem(STORAGE_KEY) ?? '');
    }
  } catch {
    /* ignore */
  }
  const env = import.meta.env.VITE_RELAY_URL as string | undefined;
  return normalizeBase(env?.trim() ?? '');
}

export function setRelayBaseUrl(url: string): void {
  try {
    const t = url.trim();
    if (!t) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, normalizeBase(t));
  } catch {
    /* ignore */
  }
}

export function apiUrl(path: string): string {
  const base = getRelayBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
