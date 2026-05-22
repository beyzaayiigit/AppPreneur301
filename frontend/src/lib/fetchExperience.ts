import type { WelcomeExperience } from '../data/welcomeExperience';

function isExperience(x: unknown): x is WelcomeExperience {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.tips) || !Array.isArray(o.pillars)) return false;
  if (!o.spotlight || typeof o.spotlight !== 'object') return false;
  if (typeof o.tagline !== 'string' || typeof o.refreshed_at !== 'string') return false;
  return true;
}

/**
 * Backend `/api/v1/experience` yanıtını çeker; başarısızda `null`.
 * Android emülatör: genelde `http://10.0.2.2:3001` — `app.json` > `extra.lumerisApiBaseUrl`.
 */
export async function fetchWelcomeExperience(baseUrl: string): Promise<WelcomeExperience | null> {
  const root = baseUrl.replace(/\/$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const res = await fetch(`${root}/api/v1/experience`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isExperience(data) ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
