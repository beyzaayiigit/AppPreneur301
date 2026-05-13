import { ImageFormat, useCanvasRef } from '@shopify/react-native-skia';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { EditorCanvas } from '../components/EditorCanvas';
import { SliderRow } from '../components/SliderRow';
import type { EditState } from '../engine/editState';
import { PRESET_NAMES, PRESET_SHORT_LABELS, presetThumbBackground } from '../engine/presets';
import { useUndoableEditState } from '../hooks/useUndoableEditState';
import { recordFirstEditIfNeeded } from '../lib/kpi';
import { dark } from '../theme/colors';

/** Önizleme genişliği; yükseklik sekmeye göre tavanlanır (Adjust’ta biraz daha fazla panel kalır). */
const PREVIEW_SIDE_PAD = 24;

function computePreviewSize(
  iw: number,
  ih: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  if (!iw || !ih || !Number.isFinite(iw) || !Number.isFinite(ih)) {
    const w = maxW;
    return { w, h: Math.min(Math.round((w * 4) / 3), maxH) };
  }
  const scale = Math.min(maxW / iw, maxH / ih);
  return {
    w: Math.max(1, Math.round(iw * scale)),
    h: Math.max(1, Math.round(ih * scale)),
  };
}

function computeContainRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { x: number; y: number; width: number; height: number } {
  const safeSrcW = Math.max(1, srcW);
  const safeSrcH = Math.max(1, srcH);
  const scale = Math.min(dstW / safeSrcW, dstH / safeSrcH);
  const width = Math.max(1, safeSrcW * scale);
  const height = Math.max(1, safeSrcH * scale);
  return {
    x: (dstW - width) / 2,
    y: (dstH - height) / 2,
    width,
    height,
  };
}

/** Skia snapshot için tamsayı sınırlar; taşma / sıfır boyut hatalarını azaltır */
function clampSnapRect(
  rect: { x: number; y: number; width: number; height: number },
  maxW: number,
  maxH: number,
): { x: number; y: number; width: number; height: number } {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  let width = Math.max(1, Math.round(rect.width));
  let height = Math.max(1, Math.round(rect.height));
  if (x + width > maxW) width = Math.max(1, maxW - x);
  if (y + height > maxH) height = Math.max(1, maxH - y);
  return { x, y, width, height };
}

function mediaLibraryAccessOk(r: MediaLibrary.PermissionResponse): boolean {
  return (
    r.granted ||
    r.status === MediaLibrary.PermissionStatus.GRANTED ||
    r.accessPrivileges === 'limited'
  );
}

function computeAspectCropRect(
  rect: { x: number; y: number; width: number; height: number },
  aspect: ExportAspect,
): { x: number; y: number; width: number; height: number } {
  if (aspect === 'original') return rect;
  const target = aspect === '1:1' ? 1 : 9 / 16;
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

type EditorTab = 'looks' | 'edit';
type ExportQuality = 'hd' | 'raw' | '4k';
type ExportAspect = 'original' | '9:16' | '1:1';
type AdjustCategory = 'light' | 'color' | 'detail';
type AdjustKey =
  | 'exposure'
  | 'contrast'
  | 'temperature'
  | 'pop'
  | 'selectiveSkin'
  | 'selectiveSky'
  | 'selectiveGreen'
  | 'selectiveWarm'
  | 'saturation'
  | 'sharpness'
  | 'fade'
  | 'vignette'
  | 'grain';

type Props = {
  imageUri: string;
  onBack: () => void;
};

function formatExposure(v: number) {
  if (v === 0) return '0.00';
  return `${v > 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}`;
}

function formatContrastUi(c: number) {
  const x = Math.round((c - 1) * 100);
  if (x === 0) return '0';
  return `${x > 0 ? '+' : ''}${x}`;
}

function formatWarmthUi(t: number) {
  const x = Math.round(t * 100);
  if (x === 0) return '0';
  const sign = x > 0 ? '+' : '-';
  return `${sign}${Math.abs(x)}`;
}

function formatPopUi(p: number) {
  const x = Math.round(p * 100);
  if (x === 0) return '0';
  return `+${x}`;
}

function formatSelectiveUi(v: number) {
  const x = Math.round(v * 100);
  if (x === 0) return '0';
  return `${x > 0 ? '+' : ''}${x}`;
}

/** 0 → "0"; gereksiz ondalıkları kısaltır */
function formatDecimalUi(v: number, maxDecimals = 2): string {
  if (!Number.isFinite(v)) return '0';
  const t = parseFloat(v.toFixed(maxDecimals));
  if (t === 0) return '0';
  if (Number.isInteger(t)) return String(t);
  return String(t);
}

const ADJUST_CONTROLS: {
  category: AdjustCategory;
  key: AdjustKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}[] = [
  { category: 'light', key: 'exposure', label: 'EXPOSURE', min: -2, max: 2, step: 0.05, format: formatExposure },
  { category: 'light', key: 'contrast', label: 'CONTRAST', min: 0.5, max: 1.5, step: 0.01, format: formatContrastUi },
  { category: 'light', key: 'pop', label: 'POP', min: 0, max: 1, step: 0.02, format: formatPopUi },
  { category: 'color', key: 'temperature', label: 'WARMTH', min: -1, max: 1, step: 0.02, format: formatWarmthUi },
  { category: 'color', key: 'saturation', label: 'SATURATION', min: 0, max: 2, step: 0.01, format: formatDecimalUi },
  { category: 'color', key: 'selectiveSkin', label: 'SKIN', min: -1, max: 1, step: 0.02, format: formatSelectiveUi },
  { category: 'color', key: 'selectiveSky', label: 'SKY / BLUE', min: -1, max: 1, step: 0.02, format: formatSelectiveUi },
  { category: 'color', key: 'selectiveGreen', label: 'GREEN', min: -1, max: 1, step: 0.02, format: formatSelectiveUi },
  { category: 'color', key: 'selectiveWarm', label: 'WARM', min: -1, max: 1, step: 0.02, format: formatSelectiveUi },
  { category: 'detail', key: 'sharpness', label: 'SHARPNESS', min: 0, max: 2, step: 0.05, format: formatDecimalUi },
  { category: 'detail', key: 'grain', label: 'GRAIN', min: 0, max: 1, step: 0.02, format: formatDecimalUi },
  { category: 'detail', key: 'fade', label: 'FADE', min: 0, max: 1, step: 0.02, format: formatDecimalUi },
  { category: 'detail', key: 'vignette', label: 'VIGNETTE', min: 0, max: 1, step: 0.02, format: formatDecimalUi },
];

export function EditorScreen({ imageUri, onBack }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const screenH = Dimensions.get('screen').height;
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 6 : 44;
  const panelHeight = Math.max(168, Math.min(236, Math.round(winH * 0.225)));
  const previewMaxW = winW - PREVIEW_SIDE_PAD;
  const previewMaxH = Math.round(winH * 0.58);
  const canvasRef = useCanvasRef();
  const {
    current,
    update,
    commitReplace,
    beginGesture,
    endGesture,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableEditState();

  const [editorTab, setEditorTab] = useState<EditorTab>('looks');
  const [compare, setCompare] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportQuality, setExportQuality] = useState<ExportQuality>('hd');
  const [exportAspect, setExportAspect] = useState<ExportAspect>('original');
  const [exportPreviewUri, setExportPreviewUri] = useState<string | null>(null);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<AdjustCategory>('light');
  const [activeAdjust, setActiveAdjust] = useState<AdjustKey>('exposure');
  const navBarInset = Math.max(0, screenH - winH);
  /** Pencere–ekran farkı bazen üst çentiği de içerir; alt tab bar’da aşırı boşluk oluşmasın diye tavanlı */
  const bottomNavPad = 6 + Math.min(Math.max(navBarInset, 4), 32);
  const isLandscapeImage = (imageDims?.width ?? 0) > (imageDims?.height ?? Number.MAX_SAFE_INTEGER);

  useEffect(() => {
    Image.getSize(
      imageUri,
      (width, height) => setImageDims({ width, height }),
      () => setImageDims(null),
    );
  }, [imageUri]);

  const previewSize = useMemo(() => {
    if (!imageDims) return computePreviewSize(3, 4, previewMaxW, previewMaxH);
    return computePreviewSize(imageDims.width, imageDims.height, previewMaxW, previewMaxH);
  }, [imageDims, previewMaxH, previewMaxW]);

  const touchEdit = useCallback(() => {
    void recordFirstEditIfNeeded();
  }, []);

  const controlsInCategory = useMemo(
    () => ADJUST_CONTROLS.filter((c) => c.category === activeCategory),
    [activeCategory],
  );

  useEffect(() => {
    if (!controlsInCategory.some((c) => c.key === activeAdjust)) {
      setActiveAdjust(controlsInCategory[0]?.key ?? 'exposure');
    }
  }, [activeAdjust, controlsInCategory]);

  const activeControl = ADJUST_CONTROLS.find((c) => c.key === activeAdjust) ?? controlsInCategory[0];

  const updateAdjustValue = (key: AdjustKey, value: number) => {
    update((c) => ({ ...c, [key]: value } as EditState));
  };

  const jpegQuality = exportQuality === '4k' ? 95 : exportQuality === 'raw' ? 98 : 88;

  const exportImage = useCallback(async () => {
    setExporting(true);
    try {
      const androidGranular: MediaLibrary.GranularPermission[] | undefined =
        Platform.OS === 'android' ? ['photo'] : undefined;

      let permOk = false;
      try {
        let perm = await MediaLibrary.requestPermissionsAsync(true, androidGranular);
        if (!mediaLibraryAccessOk(perm)) {
          perm = await MediaLibrary.requestPermissionsAsync(false, androidGranular);
        }
        permOk = mediaLibraryAccessOk(perm);
      } catch {
        permOk = false;
      }

      const isExpoGoAndroid =
        Constants.executionEnvironment === 'storeClient' && Platform.OS === 'android';

      if (!permOk && !isExpoGoAndroid) {
        Alert.alert('İzin gerekli', 'Fotoğrafı kaydetmek için fotoğraf / medya kitaplığı izni verin.');
        return;
      }

      const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!baseDir) {
        Alert.alert('Dışa aktarma', 'Cihazda geçici dosya konumu kullanılamıyor.');
        return;
      }

      const srcW = imageDims?.width ?? previewSize.w;
      const srcH = imageDims?.height ?? previewSize.h;
      const containRect = computeContainRect(srcW, srcH, previewSize.w, previewSize.h);
      const cropRect = clampSnapRect(
        computeAspectCropRect(containRect, exportAspect),
        previewSize.w,
        previewSize.h,
      );
      const snap = canvasRef.current?.makeImageSnapshot(cropRect);
      if (!snap) {
        Alert.alert('Dışa aktarma', 'Görüntü oluşturulamadı. Tekrar deneyin.');
        return;
      }
      const base64 = snap.encodeToBase64(ImageFormat.JPEG, jpegQuality);
      const path = `${baseDir}lumeris_export_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!permOk && isExpoGoAndroid) {
        const contentUri = await FileSystem.getContentUriAsync(path);
        await Share.share({ title: 'Lumeris', url: contentUri });
        setExportOpen(false);
        Alert.alert(
          'Expo Go (Android)',
          'Bu ortamda galeriye doğrudan kayıt kısıtlıdır; dosyayı paylaşım ekranından Fotoğraflar veya Dosyalar uygulamasına kaydedebilirsiniz.',
        );
        return;
      }

      try {
        await MediaLibrary.saveToLibraryAsync(path);
      } catch (saveErr) {
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(path);
            await Share.share({ title: 'Lumeris', url: contentUri });
            setExportOpen(false);
            Alert.alert(
              'Paylaş',
              'Galeriye otomatik kayıt başarısız oldu; dosyayı paylaşım sayfasından kaydedebilirsiniz.',
            );
            return;
          } catch {
            throw saveErr;
          }
        }
        throw saveErr;
      }

      setExportOpen(false);
      Alert.alert('Kaydedildi', 'Fotoğraf galerinize eklendi. EXIF koruma düzeyi cihaza bağlıdır.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Dışa aktarma başarısız.');
    } finally {
      setExporting(false);
    }
  }, [canvasRef, exportAspect, imageDims?.height, imageDims?.width, jpegQuality, previewSize.h, previewSize.w]);

  const setTab = (t: EditorTab) => setEditorTab(t);

  useEffect(() => {
    if (!exportOpen) return;
    const srcW = imageDims?.width ?? previewSize.w;
    const srcH = imageDims?.height ?? previewSize.h;
    const containRect = computeContainRect(srcW, srcH, previewSize.w, previewSize.h);
    const cropRect = clampSnapRect(
      computeAspectCropRect(containRect, exportAspect),
      previewSize.w,
      previewSize.h,
    );
    const snap = canvasRef.current?.makeImageSnapshot(cropRect);
    if (!snap) {
      setExportPreviewUri(null);
      return;
    }
    setExportPreviewLoading(true);
    try {
      const base64 = snap.encodeToBase64(ImageFormat.JPEG, 78);
      setExportPreviewUri(`data:image/jpeg;base64,${base64}`);
    } finally {
      setExportPreviewLoading(false);
    }
  }, [canvasRef, current, exportAspect, exportOpen, imageDims?.height, imageDims?.width, previewSize.h, previewSize.w]);

  return (
    <View style={styles.root}>
      <View style={[styles.toolbar, { paddingTop: topInset }]}>
        <Pressable onPress={onBack} style={styles.toolIcon} accessibilityLabel="Geri">
          <Text style={styles.toolIconText}>←</Text>
        </Pressable>
        <Pressable
          onPress={undo}
          disabled={!canUndo}
          style={[styles.toolIcon, !canUndo && styles.disabled]}
          accessibilityLabel="Geri al"
        >
          <Text style={styles.toolIconText}>↺</Text>
        </Pressable>
        <Pressable
          onPress={redo}
          disabled={!canRedo}
          style={[styles.toolIcon, !canRedo && styles.disabled]}
          accessibilityLabel="Yinele"
        >
          <Text style={styles.toolIconText}>↻</Text>
        </Pressable>
        <Text style={styles.brandTitle} pointerEvents="none">
          LUMERIS
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.body}>
        <View style={[styles.previewSlot, isLandscapeImage && styles.previewSlotLandscape]}>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityHint="Basılı tutarak orijinali gösterir"
            onPressIn={() => setCompare(true)}
            onPressOut={() => setCompare(false)}
            style={[styles.previewCard, { width: previewSize.w }]}
          >
            <EditorCanvas
              uri={imageUri}
              state={current}
              compare={compare}
              width={previewSize.w}
              height={previewSize.h}
              canvasRef={canvasRef}
            />
            <Text style={styles.compareHint}>Basılı tut — karşılaştır</Text>
            {imageDims ? (
              <View style={styles.resBadge}>
                <Text style={styles.resBadgeText}>
                  {imageDims.width} × {imageDims.height}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <View style={[styles.panel, { height: panelHeight }]}>
          <View style={styles.panelBody}>
            {editorTab === 'looks' ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.presetStrip}
                >
                  {PRESET_NAMES.map((name, idx) => {
                    const on = current.presetIndex === idx;
                    return (
                      <Pressable
                        key={name}
                        onPress={() => {
                          touchEdit();
                          commitReplace({ ...current, presetIndex: idx });
                        }}
                        style={styles.presetTile}
                        accessibilityLabel={name}
                      >
                        <View
                          style={[
                            styles.presetTileInner,
                            { backgroundColor: presetThumbBackground(idx) },
                            on && styles.presetTileInnerOn,
                          ]}
                        >
                          <Text style={styles.presetTileLabel}>{PRESET_SHORT_LABELS[idx]}</Text>
                        </View>
                        <Text style={[styles.presetName, on && styles.presetNameOn]} numberOfLines={1}>
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.looksIntensitySlot}>
                  {current.presetIndex !== 0 ? (
                    <SliderRow
                      appearance="dark"
                      label="INTENSITY"
                      value={current.presetIntensity}
                      min={0}
                      max={100}
                      step={1}
                      sliderRemountKey={`intensity-${current.presetIndex}`}
                      format={(v) => `${Math.round(v)}`}
                      onChange={(v) => update((c) => ({ ...c, presetIntensity: v }))}
                      onSlidingStart={() => {
                        beginGesture();
                        touchEdit();
                      }}
                      onSlidingComplete={() => endGesture()}
                    />
                  ) : (
                    <Text style={styles.looksHint}>Original seçiliyken intensity kapalı</Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.categoryRow}>
                  {(['light', 'color', 'detail'] as const).map((cat) => {
                    const on = activeCategory === cat;
                    const label = cat === 'light' ? 'LIGHT' : cat === 'color' ? 'COLOR' : 'DETAIL';
                    return (
                      <Pressable
                        key={cat}
                        style={[styles.categoryChip, on && styles.categoryChipOn]}
                        onPress={() => setActiveCategory(cat)}
                      >
                        <Text style={[styles.categoryChipText, on && styles.categoryChipTextOn]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.adjustChipRow}
                >
                  {controlsInCategory.map((control) => {
                    const isOn = control.key === activeAdjust;
                    return (
                      <Pressable
                        key={control.key}
                        style={[styles.adjustChip, isOn && styles.adjustChipOn]}
                        onPress={() => setActiveAdjust(control.key)}
                      >
                        <Text style={[styles.adjustChipText, isOn && styles.adjustChipTextOn]}>
                          {control.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <SliderRow
                  appearance="dark"
                  label={activeControl.label}
                  value={current[activeControl.key]}
                  min={activeControl.min}
                  max={activeControl.max}
                  step={activeControl.step}
                  format={activeControl.format}
                  sliderRemountKey={`${activeCategory}-${activeControl.key}`}
                  onChange={(v) => updateAdjustValue(activeControl.key, v)}
                  onSlidingStart={() => {
                    beginGesture();
                    touchEdit();
                  }}
                  onSlidingComplete={() => endGesture()}
                />
              </>
            )}
          </View>
        </View>
        <View style={[styles.bottomNav, { paddingBottom: bottomNavPad }]}>
          <Pressable
            style={[styles.navCell, editorTab === 'looks' && styles.navCellOn]}
            onPress={() => setTab('looks')}
            accessibilityLabel="Looks"
          >
            <Text style={styles.navIcon}>✦</Text>
            <Text style={[styles.navLabel, editorTab === 'looks' && styles.navLabelOn]}>LOOKS</Text>
          </Pressable>
          <Pressable
            style={[styles.navCell, editorTab === 'edit' && styles.navCellOn]}
            onPress={() => setTab('edit')}
            accessibilityLabel="Edit"
          >
            <Text style={styles.navIcon}>≡</Text>
            <Text style={[styles.navLabel, editorTab === 'edit' && styles.navLabelOn]}>EDIT</Text>
          </Pressable>
          <Pressable
            style={styles.navCell}
            onPress={() => setExportOpen(true)}
            accessibilityLabel="Export"
          >
            <Text style={styles.navIcon}>⇪</Text>
            <Text style={styles.navLabel}>EXPORT</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={exportOpen} animationType="slide" transparent onRequestClose={() => setExportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setExportOpen(false)} accessibilityLabel="Kapat">
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
              <Text style={styles.modalBrand}>LUMERIS</Text>
              <View style={{ width: 28 }} />
            </View>

            <Image
              source={{ uri: exportPreviewUri ?? imageUri }}
              style={styles.modalPreview}
              resizeMode="contain"
            />
            {exportPreviewLoading ? <Text style={styles.modalPreviewHint}>Önizleme hazırlanıyor…</Text> : null}

            <Text style={styles.modalSectionLabel}>KALİTE</Text>
            <View style={styles.segmentRow}>
              {(['hd', 'raw', '4k'] as const).map((q) => (
                <Pressable
                  key={q}
                  onPress={() => setExportQuality(q)}
                  style={[styles.segment, exportQuality === q && styles.segmentOn]}
                >
                  <Text style={[styles.segmentText, exportQuality === q && styles.segmentTextOn]}>
                    {q === 'hd' ? 'HD' : q === 'raw' ? 'RAW' : '4K'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>BOYUT</Text>
            <View style={styles.segmentRow}>
              {(['original', '9:16', '1:1'] as const).map((a) => (
                <Pressable
                  key={a}
                  onPress={() => setExportAspect(a)}
                  style={[styles.segment, exportAspect === a && styles.segmentOn]}
                >
                  <Text style={[styles.segmentText, exportAspect === a && styles.segmentTextOn]}>
                    {a === 'original' ? 'Original' : a === '9:16' ? '9:16' : '1:1'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.modalHint}>
              Boyut seçimi dışa aktarmada merkez kırpma olarak uygulanır.
            </Text>

            <Pressable
              style={[styles.modalSave, exporting && styles.disabled]}
              disabled={exporting}
              onPress={() => void exportImage()}
            >
              <Text style={styles.modalSaveText}>{exporting ? '…' : 'Kaydet'}</Text>
            </Pressable>

            <Text style={styles.shareDivider}>VEYA ŞURADA PAYLAŞ</Text>
            <View style={styles.shareRow}>
              <Pressable
                style={styles.shareDot}
                onPress={() => void Share.share({ message: 'Lumeris', url: imageUri }).catch(() => {})}
              >
                <Text style={styles.shareDotText}>↗</Text>
              </Pressable>
              <Pressable style={styles.shareDot}>
                <Text style={styles.shareDotText}>◎</Text>
              </Pressable>
              <Pressable style={styles.shareDot}>
                <Text style={styles.shareDotText}>@</Text>
              </Pressable>
              <Pressable style={styles.shareDot}>
                <Text style={styles.shareDotText}>···</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 8,
    backgroundColor: dark.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dark.border,
  },
  toolIcon: { paddingHorizontal: 8, paddingVertical: 6 },
  toolIconText: { color: dark.text, fontSize: 20, fontWeight: '600' },
  brandTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: dark.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  disabled: { opacity: 0.35 },
  body: { flex: 1 },
  previewSlot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 140,
  },
  previewSlotLandscape: {
    justifyContent: 'center',
  },
  previewCard: {
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: dark.canvas,
    alignSelf: 'center',
  },
  compareHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  resBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  resBadgeText: { color: dark.text, fontSize: 11, fontWeight: '600' },
  panel: {
    flexShrink: 0,
    minHeight: 156,
    marginTop: 6,
    backgroundColor: dark.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: dark.border,
  },
  panelBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.bgElevated,
    alignItems: 'center',
  },
  categoryChipOn: {
    borderColor: dark.accent,
    backgroundColor: dark.surfaceMuted,
  },
  categoryChipText: { color: dark.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  categoryChipTextOn: { color: dark.accent },
  presetStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
  },
  presetTile: { width: 64, alignItems: 'center' },
  presetTileInner: {
    width: 56,
    height: 72,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetTileInnerOn: {
    borderColor: dark.accent,
    shadowColor: dark.accent,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  presetName: {
    marginTop: 6,
    fontSize: 9,
    color: dark.textDim,
    maxWidth: 64,
    textAlign: 'center',
  },
  presetNameOn: { color: dark.accent, fontWeight: '700' },
  presetTileLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  adjustChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    paddingTop: 2,
    paddingRight: 10,
  },
  adjustChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.bgElevated,
  },
  adjustChipOn: {
    borderColor: dark.accent,
    backgroundColor: dark.surfaceMuted,
  },
  adjustChipText: { color: dark.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  adjustChipTextOn: { color: dark.accent },
  looksIntensitySlot: {
    minHeight: 80,
    justifyContent: 'center',
    marginTop: 8,
  },
  looksHint: {
    color: dark.textDim,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dark.border,
    backgroundColor: dark.surface,
  },
  navCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: dark.bgElevated,
  },
  navCellOn: {
    backgroundColor: dark.surfaceMuted,
    borderWidth: 1,
    borderColor: dark.accentMuted,
  },
  navIcon: { fontSize: 18, color: dark.text, marginBottom: 2 },
  navLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: dark.textMuted },
  navLabelOn: { color: dark.accent },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: dark.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalClose: { color: dark.textMuted, fontSize: 18, padding: 8 },
  modalBrand: { color: dark.text, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  modalPreview: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: dark.canvas,
    marginBottom: 16,
  },
  modalPreviewHint: {
    marginTop: -10,
    marginBottom: 12,
    color: dark.textDim,
    fontSize: 11,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: dark.textMuted,
    marginBottom: 8,
  },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: dark.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  segmentOn: {
    backgroundColor: dark.accent,
    borderColor: dark.accent,
  },
  segmentText: { fontSize: 13, fontWeight: '700', color: dark.textMuted },
  segmentTextOn: { color: dark.bg },
  modalHint: { fontSize: 11, color: dark.textDim, marginBottom: 16, lineHeight: 16 },
  modalSave: {
    backgroundColor: dark.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSaveText: { color: dark.bg, fontSize: 16, fontWeight: '800' },
  shareDivider: {
    textAlign: 'center',
    color: dark.textDim,
    fontSize: 11,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  shareRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  shareDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  shareDotText: { color: dark.text, fontSize: 16 },
});
