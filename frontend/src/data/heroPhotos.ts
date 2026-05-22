/**
 * Karşılama hero arka planları — Unsplash üzerinden yalnızca görüntü URL’si (dekoratif).
 * Ürün fotoğrafları sunucuya gönderilmez; bu istekler yalnızca cihazdan bu URL’lere gider.
 * @see https://unsplash.com/license
 */
export const WELCOME_HERO_REMOTE_URIS: readonly string[] = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1470071459604-3b5e3e5e8d6f?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1493246507139-2e8e807b7b8f?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=85',
] as const;

export function pickRandomWelcomeHeroUri(): string {
  const list = WELCOME_HERO_REMOTE_URIS;
  const i = Math.floor(Math.random() * list.length);
  return list[i] ?? list[0];
}
