/** Karşılama deneyimi; `createDefaultWelcomeExperience()` her çağrıda güncel haftalık vitrin üretir. */

import { PRESET_NAMES, PRESET_SHORT_LABELS } from '../engine/presets';
import { WEEKLY_PRESET_COUNT, weeklySpotlightMeta } from '../lib/weeklyPreset';
import { spotlightBodyForPresetIndex } from './presetSpotlightCopy';

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

export const HERO_COPY = {
  title: 'Işığınızı Keşfedin',
  subtitle:
    'Acele etmeyen bir karanlık oda. Renk ve ışığa yavaşça dokunun — görüntü yalnızca cihazınızda kalır.',
} as const;

const TIPS: TipItem[] = [
  {
    id: 'compare',
    title: 'Karşılaştırma',
    body: 'Önizlemede basılı tutun: orijinalle düzenlenmişi yan yana hissedin; ince ayarları netleştirir.',
  },
  {
    id: 'grain',
    title: 'Film greni',
    body: 'Az gren, sıcaklık ve fade ile birlikte mat film hissini güçlendirir; portrelerde düşük değerler genelde yeter.',
  },
  {
    id: 'presets',
    title: 'Ön ayar + yoğunluk',
    body: "Looks'ta bir stil seçin, ardından yoğunlukla karışımı damıtın; Adjust'ta pozlama ve kontrastla inceleyin.",
  },
  {
    id: 'export',
    title: 'Dışa aktarma',
    body: "Export'ta kaliteyi ihtiyaca göre seçin; büyük baskılar için daha yüksek kalite, hızlı paylaşım için standart yeterli olabilir.",
  },
];

const PILLARS: PillarItem[] = [
  {
    id: 'privacy',
    title: 'Görüntü sunucuya uğramaz',
    subtitle: 'Düzenleme cihazınızda kalır; hesap veya bulut gerekmez.',
    icon: '◎',
  },
  {
    id: 'craft',
    title: 'Analog his',
    subtitle: 'Ön ayarlar, gren ve fade ile tek nefeste sinematik doku.',
    icon: '◐',
  },
  {
    id: 'calm',
    title: 'Sessiz ekran',
    subtitle: 'Reklam ve abonelik baskısı yok. Odak: fotoğrafınız ve kontroller.',
    icon: '◇',
  },
];

function buildWeeklySpotlight(now = new Date()): Spotlight {
  const { presetIndex, slotOneBased, total } = weeklySpotlightMeta(now);
  const title = PRESET_NAMES[presetIndex] ?? '';
  const short = PRESET_SHORT_LABELS[presetIndex] ?? '';
  return {
    preset_index: presetIndex,
    preset_short_label: short,
    badge: `Haftanın ön ayarı · ${slotOneBased}/${total}`,
    title,
    body: spotlightBodyForPresetIndex(presetIndex, title),
  };
}

/** Yerleşik içerik + o anki haftalık vitrin (UTC 7 günlük blok; backend ile uyumlu). */
export function createDefaultWelcomeExperience(now = new Date()): WelcomeExperience {
  return {
    tips: TIPS,
    pillars: PILLARS,
    spotlight: buildWeeklySpotlight(now),
    tagline: 'Lumeris, cihazınızda çalışan sessiz bir düzenleme alanı.',
    refreshed_at: '',
  };
}

/** Haftalık vitrin döngüsündeki toplam ön ayar sayısı (Original hariç). */
export { WEEKLY_PRESET_COUNT };
