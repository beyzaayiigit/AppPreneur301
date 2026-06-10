export type ExportQuality = 'standard' | 'high' | 'maximum';

export type ExportAspect = 'original' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16' | '16:9';

export type SnapRect = { x: number; y: number; width: number; height: number };

export const EXPORT_QUALITY_PRESETS = {
  standard: { label: 'Standart', hint: '~1920px', maxLongEdge: 1920, jpegQuality: 88 },
  high: { label: 'Yüksek', hint: '~2560px', maxLongEdge: 2560, jpegQuality: 92 },
  maximum: { label: 'Maksimum', hint: '~4K', maxLongEdge: 4096, jpegQuality: 95 },
} as const satisfies Record<
  ExportQuality,
  { label: string; hint: string; maxLongEdge: number; jpegQuality: number }
>;

export const EXPORT_ASPECT_OPTIONS: { id: ExportAspect; label: string }[] = [
  { id: 'original', label: 'Orijinal' },
  { id: '1:1', label: '1:1' },
  { id: '4:5', label: '4:5' },
  { id: '3:4', label: '3:4' },
  { id: '2:3', label: '2:3' },
  { id: '9:16', label: '9:16' },
  { id: '16:9', label: '16:9' },
];

const ASPECT_RATIO: Record<Exclude<ExportAspect, 'original'>, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
};

export function clampSnapRect(rect: SnapRect, maxW: number, maxH: number): SnapRect {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  let width = Math.max(1, Math.round(rect.width));
  let height = Math.max(1, Math.round(rect.height));
  if (x + width > maxW) width = Math.max(1, maxW - x);
  if (y + height > maxH) height = Math.max(1, maxH - y);
  return { x, y, width, height };
}

export function computeAspectCropRect(rect: SnapRect, aspect: ExportAspect): SnapRect {
  if (aspect === 'original') return rect;
  const target = ASPECT_RATIO[aspect];
  const srcRatio = rect.width / rect.height;
  if (srcRatio > target) {
    const width = rect.height * target;
    return {
      x: rect.x + (rect.width - width) / 2,
      y: rect.y,
      width,
      height: rect.height,
    };
  }
  const height = rect.width / target;
  return {
    x: rect.x,
    y: rect.y + (rect.height - height) / 2,
    width: rect.width,
    height,
  };
}

function computeScaledImageSize(
  srcW: number,
  srcH: number,
  maxLongEdge: number,
): { w: number; h: number } {
  const safeW = Math.max(1, srcW);
  const safeH = Math.max(1, srcH);
  const long = Math.max(safeW, safeH);
  const scale = Math.min(1, maxLongEdge / long);
  return {
    w: Math.max(1, Math.round(safeW * scale)),
    h: Math.max(1, Math.round(safeH * scale)),
  };
}

export type ExportLayout = {
  canvasW: number;
  canvasH: number;
  cropRect: SnapRect;
  jpegQuality: number;
  outputLabel: string;
};

/** Editör önizleme canvas'ından snapshot alınacak kırpma alanı (WYSIWYG). */
export function computePreviewExportSnapRect(
  srcW: number,
  srcH: number,
  previewW: number,
  previewH: number,
  aspect: ExportAspect,
): SnapRect {
  const safeSrcW = Math.max(1, srcW);
  const safeSrcH = Math.max(1, srcH);
  const scale = Math.min(previewW / safeSrcW, previewH / safeSrcH);
  const width = Math.max(1, safeSrcW * scale);
  const height = Math.max(1, safeSrcH * scale);
  const contain = {
    x: (previewW - width) / 2,
    y: (previewH - height) / 2,
    width,
    height,
  };
  return clampSnapRect(computeAspectCropRect(contain, aspect), previewW, previewH);
}

export function computeExportLayout(
  srcW: number,
  srcH: number,
  quality: ExportQuality,
  aspect: ExportAspect,
): ExportLayout {
  const preset = EXPORT_QUALITY_PRESETS[quality];
  const { w: canvasW, h: canvasH } = computeScaledImageSize(srcW, srcH, preset.maxLongEdge);
  const cropRect = clampSnapRect(
    computeAspectCropRect({ x: 0, y: 0, width: canvasW, height: canvasH }, aspect),
    canvasW,
    canvasH,
  );
  return {
    canvasW,
    canvasH,
    cropRect,
    jpegQuality: preset.jpegQuality,
    outputLabel: `${Math.round(cropRect.width)}×${Math.round(cropRect.height)}`,
  };
}
