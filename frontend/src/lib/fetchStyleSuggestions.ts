import type { SuggestStylesResponse } from './editRecipe';

const TIMEOUT_MS = 90_000;

function isSuggestResponse(x: unknown): x is SuggestStylesResponse {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.directions) || o.directions.length < 1) return false;
  if (typeof o.reasoning_tr !== 'string') return false;
  return true;
}

export type FetchStyleResult =
  | { ok: true; data: SuggestStylesResponse }
  | { ok: false; error: 'no_base_url' | 'timeout' | 'http' | 'invalid' | 'network' };

/**
 * POST /api/v1/suggest-styles — long timeout for Render cold starts.
 */
export async function fetchStyleSuggestions(
  baseUrl: string,
  body: { prompt?: string; imageBase64?: string; mimeType?: string },
): Promise<FetchStyleResult> {
  const root = baseUrl.replace(/\/$/, '');
  if (!root) return { ok: false, error: 'no_base_url' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${root}/api/v1/suggest-styles`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: body.prompt?.trim() || null,
        image_base64: body.imageBase64 ?? null,
        mime_type: body.mimeType ?? 'image/jpeg',
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: 'http' };
    const data: unknown = await res.json();
    if (!isSuggestResponse(data)) return { ok: false, error: 'invalid' };
    return { ok: true, data };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
