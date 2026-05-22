/** Karşılama deneyimi; `createDefaultWelcomeExperience()` her çağrıda güncel haftalık vitrin üretir. */

import { PRESET_NAMES, PRESET_SHORT_LABELS } from '../engine/presets';
import { weeklyPresetCatalogIndexUtc } from '../lib/weeklyPreset';

export type TipItem = {
  id: string;
  title: string;
  body: string;
};

export type PillarItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
};

export type Spotlight = {
  preset_index: number;
  preset_short_label: string;
  badge: string;
  title: string;
  body: string;
};

export type WelcomeExperience = {
  tips: TipItem[];
  pillars: PillarItem[];
  spotlight: Spotlight;
  tagline: string;
  refreshed_at: string;
};

const TIPS: TipItem[] = [
  {
    id: 'compare',
    title: 'Karşılaştırma',
    body: 'Önizlemede basılı tutun: orijinalle düzenlenmişi yan yana hissedin; ince ayarları netleştirir.',
  },
  {
    id: 'grain',
    title: 'Film greni',
    body: 'Az gren, sıcaklık ve fade ile birlikte ‘mat film’ hissini güçlendirir; portrelerde düşük değerler genelde yeter.',
  },
  {
    id: 'presets',
    title: 'Ön ayar + yoğunluk',
    body: 'Looks’ta bir stil seçin, ardından yoğunlukla karışımı damıtın; Adjust’ta pozlama/kontrastla inceleyin.',
  },
  {
    id: 'export',
    title: 'Dışa aktarma',
    body: 'Export’ta kaliteyi ihtiyaca göre seçin; büyük baskılar için daha yüksek kalite, hızlı paylaşım için HD yeterli olabilir.',
  },
];

const PILLARS: PillarItem[] = [
  {
    id: 'privacy',
    title: 'Fotoğraf sunucuya gitmez',
    subtitle: 'Düzenleme ve dışa aktarma cihazınızda; hesap veya bulut şart değil.',
    icon: '◎',
  },
  {
    id: 'craft',
    title: 'Analog his',
    subtitle: 'Ön ayarlar, gren, vignette ve fade ile tek tonda sinematik görünüm.',
    icon: '◐',
  },
  {
    id: 'calm',
    title: 'Reklamsız sakinlik',
    subtitle: 'Odak: görüntü ve kontroller. Abonelik baskısı yok.',
    icon: '◇',
  },
];

function buildWeeklySpotlight(now = new Date()): Spotlight {
  const idx = weeklyPresetCatalogIndexUtc(now);
  const title = PRESET_NAMES[idx] ?? '';
  const short = PRESET_SHORT_LABELS[idx] ?? '';
  return {
    preset_index: idx,
    preset_short_label: short,
    badge: 'Bu haftanın ön ayarı',
    title,
    body: `${title} — Looks’ta deneyin; yoğunlukla yumuşatın.`,
  };
}

/** Yerleşik içerik + o anki haftalık vitrin (UTC 7 günlük blok; backend ile uyumlu). */
export function createDefaultWelcomeExperience(now = new Date()): WelcomeExperience {
  return {
    tips: TIPS,
    pillars: PILLARS,
    spotlight: buildWeeklySpotlight(now),
    tagline: 'Işığı cihazınızda tutun — Lumeris düzenleme motoru tamamen yerel.',
    refreshed_at: '',
  };
}
