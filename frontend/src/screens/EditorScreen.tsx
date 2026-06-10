import { ImageFormat, useCanvasRef } from '@shopify/react-native-skia';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { EditorCanvas } from '../components/EditorCanvas';
import { EditorSideMenu } from '../components/EditorSideMenu';
import { AdjustToolGlyph, AiSparkGlyph, LooksFlowerGlyph, SlidersNavGlyph } from '../components/EditorGlyphIcons';
import { SavedRecipesModal } from '../components/SavedRecipesModal';
import { SaveRecipeModal } from '../components/SaveRecipeModal';
import { SliderRow } from '../components/SliderRow';
import { StyleTriadPanel } from '../components/StyleTriadPanel';
import { cloneEditState, type AdjustKey, type EditState } from '../engine/editState';
import { PRESET_NAMES, PRESET_SHORT_LABELS, presetThumbBackground } from '../engine/presets';
import { useUndoableEditState } from '../hooks/useUndoableEditState';
import { getLumerisApiBaseUrl } from '../lib/apiBaseUrl';
import {
  computeExportLayout,
  computePreviewExportSnapRect,
  EXPORT_ASPECT_OPTIONS,
  EXPORT_QUALITY_PRESETS,
  type ExportAspect,
  type ExportQuality,
} from '../lib/exportCapture';
import { upscaleExportJpeg } from '../lib/finalizeExportImage';
import { recordFirstEditIfNeeded } from '../lib/kpi';
import { addSavedRecipe, getSavedRecipeCount, isDefaultEditState } from '../lib/savedRecipesStorage';
import { shareImageFile } from '../lib/shareImageFile';
import { suggestRecipeName } from '../lib/suggestRecipeName';
import { dark } from '../theme/colors';
import { fonts } from '../theme/typography';

/** Önizleme genişliği; yükseklik sekmeye göre tavanlanır (Adjust’ta biraz daha fazla panel kalır). */
const PREVIEW_SIDE_PAD = 24;

/** Skia karesinin GPU’ya çizilmesi için bir sonraki frame(ler)den sonra snapshot alınır */
function waitPaintFrames(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    let n = frames;
    const step = () => {
      n -= 1;
      if (n <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

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

function mediaLibraryAccessOk(r: MediaLibrary.PermissionResponse): boolean {
  return (
    r.granted ||
    r.status === MediaLibrary.PermissionStatus.GRANTED ||
    r.accessPrivileges === 'limited'
  );
}

type EditorTab = 'looks' | 'edit' | 'ai';
type AdjustCategory = 'light' | 'color' | 'detail';

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

const ADJUST_SHORT_LABEL: Record<AdjustKey, string> = {
  exposure: 'Exposure',
  contrast: 'Contrast',
  pop: 'Pop',
  temperature: 'Warmth',
  saturation: 'Saturation',
  selectiveSkin: 'Skin',
  selectiveSky: 'Sky',
  selectiveGreen: 'Green',
  selectiveWarm: 'Warm',
  sharpness: 'Sharpness',
  grain: 'Grain',
  fade: 'Fade',
  vignette: 'Vignette',
};

export function EditorScreen({ imageUri, onBack }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const screenH = Dimensions.get('screen').height;
  const topInset = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 6 : 44;
  const previewMaxW = winW - PREVIEW_SIDE_PAD;
  const previewMaxH = Math.round(winH * 0.58);
  const toolbarBlockH = topInset + 56;
  const sheetReserveH = Math.round(winH * 0.52) + 20;
  const previewMaxHAi = Math.max(
    120,
    Math.min(previewMaxH, Math.round(winH - toolbarBlockH - sheetReserveH)),
  );
  const canvasRef = useCanvasRef();
  const exportCacheRef = useRef<{ path: string; layoutKey: string } | null>(null);
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
  const [exportQuality, setExportQuality] = useState<ExportQuality>('high');
  const [exportAspect, setExportAspect] = useState<ExportAspect>('original');
  const [exportPreviewUri, setExportPreviewUri] = useState<string | null>(null);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [saveDefaultName, setSaveDefaultName] = useState('');
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<AdjustCategory>('light');
  const [activeAdjust, setActiveAdjust] = useState<AdjustKey>('exposure');
  const [aiBaseline, setAiBaseline] = useState<EditState | null>(null);
  const adjustToolsScrollRef = useRef<ScrollView>(null);
  const sheetScrollRef = useRef<ScrollView>(null);
  const aiPromptScrollY = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [winHBeforeKeyboard, setWinHBeforeKeyboard] = useState(winH);
  const navBarInset = Math.max(0, screenH - winH);
  /** Pencere–ekran farkı bazen üst çentiği de içerir; alt tab bar’da aşırı boşluk oluşmasın diye tavanlı */
  const bottomNavPad = 6 + Math.min(Math.max(navBarInset, 4), 32);
  const apiBase = useMemo(() => getLumerisApiBaseUrl(), []);
  const isLandscapeImage = (imageDims?.width ?? 0) > (imageDims?.height ?? Number.MAX_SAFE_INTEGER);
  const isPortraitTall =
    (imageDims?.height ?? 0) / Math.max(imageDims?.width ?? 1, 1) >= 1.45;
  const aiKeyboardOpen = editorTab === 'ai' && keyboardInset > 0;
  const toolbarApproxH = topInset + 44;
  const sheetMaxH = Math.round(winH * 0.52);
  const sheetTabChromeH = 56 + bottomNavPad;
  const sheetScrollMaxH = sheetMaxH - sheetTabChromeH;
  /** Pencere klavyeyle küçülürse sekmeleri fiziksel alta it (klavyenin altında kalsın). */
  const keyboardShrunkWindow = aiKeyboardOpen && winH < winHBeforeKeyboard - 24;
  const tabBarBottomOffset = keyboardShrunkWindow ? -keyboardInset : 0;
  const aiScrollMaxH = aiKeyboardOpen
    ? Math.max(
        120,
        (keyboardShrunkWindow ? winHBeforeKeyboard : winH) - keyboardInset - toolbarApproxH,
      )
    : undefined;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardInset(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardInset === 0) setWinHBeforeKeyboard(winH);
  }, [keyboardInset, winH]);

  const scrollAiPromptIntoView = useCallback((offsetY?: number) => {
    const y = offsetY ?? aiPromptScrollY.current;
    aiPromptScrollY.current = y;
    requestAnimationFrame(() => {
      sheetScrollRef.current?.scrollTo({
        y: Math.max(0, y - 16),
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    if (aiKeyboardOpen) scrollAiPromptIntoView();
  }, [aiKeyboardOpen, scrollAiPromptIntoView]);

  useEffect(() => {
    Image.getSize(
      imageUri,
      (width, height) => setImageDims({ width, height }),
      () => setImageDims(null),
    );
  }, [imageUri]);

  const previewSize = useMemo(() => {
    const maxH = editorTab === 'ai' ? previewMaxHAi : previewMaxH;
    if (!imageDims) return computePreviewSize(3, 4, previewMaxW, maxH);
    return computePreviewSize(imageDims.width, imageDims.height, previewMaxW, maxH);
  }, [editorTab, imageDims, previewMaxHAi, previewMaxH, previewMaxW]);

  const touchEdit = useCallback(() => {
    void recordFirstEditIfNeeded();
  }, []);

  const openSaveRecipe = useCallback(() => {
    Keyboard.dismiss();
    setCompare(false);
    if (isDefaultEditState(current)) {
      Alert.alert(
        'Henüz bir görünüm yok',
        'Kaydetmek için önce bir preset, ayar veya AI önerisi uygula.',
      );
      return;
    }
    setSaveDefaultName(suggestRecipeName(current));
    setSaveOpen(true);
  }, [current]);

  const openRecipesList = useCallback(() => {
    Keyboard.dismiss();
    setCompare(false);
    setRecipesOpen(true);
  }, []);

  const handleSaveRecipe = useCallback(
    async (name: string) => {
      setSavingRecipe(true);
      try {
        await addSavedRecipe(name, current);
        setSaveOpen(false);
      } catch {
        Alert.alert('Kaydedilemedi', 'Favori dosyasına yazılamadı. Tekrar dene.');
      } finally {
        setSavingRecipe(false);
      }
    },
    [current],
  );

  const handleApplyRecipe = useCallback(
    (state: EditState) => {
      commitReplace(cloneEditState(state));
      touchEdit();
      setAiBaseline(null);
    },
    [commitReplace, touchEdit],
  );

  const showEditorMenu = useCallback(() => {
    Keyboard.dismiss();
    setCompare(false);
    setMenuOpen(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    void getSavedRecipeCount().then(setFavoriteCount);
  }, [menuOpen]);

  const controlsInCategory = useMemo(
    () => ADJUST_CONTROLS.filter((c) => c.category === activeCategory),
    [activeCategory],
  );

  /** LIGHT/COLOR/DETAIL arasında yatay ScrollView aynı örnek kalınca eski contentOffset “sola kaymış” görünür; sıfırla. */
  useLayoutEffect(() => {
    if (editorTab !== 'edit') return;
    const id = requestAnimationFrame(() => {
      adjustToolsScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [editorTab, activeCategory]);

  useEffect(() => {
    if (!controlsInCategory.some((c) => c.key === activeAdjust)) {
      setActiveAdjust(controlsInCategory[0]?.key ?? 'exposure');
    }
  }, [activeAdjust, controlsInCategory]);

  const activeControl = ADJUST_CONTROLS.find((c) => c.key === activeAdjust) ?? controlsInCategory[0];

  const updateAdjustValue = (key: AdjustKey, value: number) => {
    update((c) => ({ ...c, [key]: value } as EditState));
  };

  const exportSourceW = imageDims?.width ?? previewSize.w;
  const exportSourceH = imageDims?.height ?? previewSize.h;

  const exportLayout = useMemo(() => {
    if (!exportOpen) return null;
    return computeExportLayout(exportSourceW, exportSourceH, exportQuality, exportAspect);
  }, [exportAspect, exportOpen, exportQuality, exportSourceH, exportSourceW]);

  const writeExportJpeg = useCallback(async (base64: string) => {
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!baseDir) {
      throw new Error('Cihazda geçici dosya konumu kullanılamıyor.');
    }
    const path = `${baseDir}lumeris_export_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  }, []);

  const previewExportSnap = useMemo(() => {
    if (!exportOpen) return null;
    return computePreviewExportSnapRect(
      exportSourceW,
      exportSourceH,
      previewSize.w,
      previewSize.h,
      exportAspect,
    );
  }, [exportAspect, exportOpen, exportSourceH, exportSourceW, previewSize.h, previewSize.w]);

  const exportLayoutKey = exportLayout
    ? `${exportLayout.cropRect.width}x${exportLayout.cropRect.height}-${exportLayout.jpegQuality}-${exportAspect}`
    : '';

  const captureExportFile = useCallback(async () => {
    if (!exportLayout || !previewExportSnap) {
      throw new Error('Dışa aktarma düzeni hazır değil.');
    }
    await waitPaintFrames(5);
    const snap = canvasRef.current?.makeImageSnapshot(previewExportSnap);
    if (!snap) {
      throw new Error('Görüntü oluşturulamadı. Tekrar deneyin.');
    }
    const rawBase64 = snap.encodeToBase64(ImageFormat.JPEG, 98);
    const tempPath = await writeExportJpeg(rawBase64);
    const finalPath = await upscaleExportJpeg(tempPath, exportLayout);
    exportCacheRef.current = { path: finalPath, layoutKey: exportLayoutKey };
    return finalPath;
  }, [canvasRef, exportAspect, exportLayout, exportLayoutKey, previewExportSnap, writeExportJpeg]);

  const resolveExportPath = useCallback(async () => {
    if (exportCacheRef.current?.layoutKey === exportLayoutKey) {
      return exportCacheRef.current.path;
    }
    return captureExportFile();
  }, [captureExportFile, exportLayoutKey]);

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

      const path = await resolveExportPath();

      if (!permOk && isExpoGoAndroid) {
        await shareImageFile(path);
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
            await shareImageFile(path);
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
      Alert.alert('Kaydedildi', 'Düzenlenmiş fotoğraf galerinize eklendi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Dışa aktarma başarısız.');
    } finally {
      setExporting(false);
    }
  }, [resolveExportPath]);

  const shareExport = useCallback(async () => {
    setExporting(true);
    try {
      const path = await resolveExportPath();
      await shareImageFile(path);
    } catch (e) {
      Alert.alert('Paylaşım', e instanceof Error ? e.message : 'Paylaşım başarısız.');
    } finally {
      setExporting(false);
    }
  }, [resolveExportPath]);

  const handleAiBeginSuggest = useCallback(() => {
    setAiBaseline(cloneEditState(current));
  }, [current]);

  const setTab = (t: EditorTab) => {
    setCompare(false);
    if (t === 'ai' && aiBaseline === null) {
      setAiBaseline(cloneEditState(current));
    }
    setEditorTab(t);
  };

  useLayoutEffect(() => {
    if (!exportOpen || !previewExportSnap) {
      setExportPreviewUri(null);
      setExportPreviewLoading(false);
      exportCacheRef.current = null;
      return;
    }

    let cancelled = false;
    setExportPreviewLoading(true);
    setExportPreviewUri(null);
    exportCacheRef.current = null;

    void waitPaintFrames(4).then(() => {
      if (cancelled) return;
      const snap = canvasRef.current?.makeImageSnapshot(previewExportSnap);
      if (cancelled) return;
      if (!snap) {
        setExportPreviewUri(null);
        setExportPreviewLoading(false);
        return;
      }
      try {
        const base64 = snap.encodeToBase64(ImageFormat.JPEG, 82);
        setExportPreviewUri(`data:image/jpeg;base64,${base64}`);
      } finally {
        if (!cancelled) setExportPreviewLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canvasRef, current, exportAspect, exportOpen, exportQuality, previewExportSnap]);

  return (
    <View style={styles.root}>
      <View style={[styles.toolbar, { paddingTop: topInset }]}>
        <View style={styles.toolbarSide}>
          <Pressable
            onPress={showEditorMenu}
            style={styles.toolIcon}
            accessibilityLabel="Menü: favoriler, ana ekrana dön"
          >
            <View style={styles.menuIcon} accessibilityIgnoresInvertColors>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
          </Pressable>
          <View style={styles.historyGroup}>
            <Pressable
              onPress={() => canUndo && undo()}
              disabled={!canUndo}
              style={[styles.historyBtn, !canUndo && styles.historyBtnDisabled]}
              accessibilityLabel="Geri al"
            >
              <Text style={[styles.historyBtnText, canUndo && styles.historyBtnTextOn]}>↩</Text>
            </Pressable>
            <Pressable
              onPress={() => canRedo && redo()}
              disabled={!canRedo}
              style={[styles.historyBtn, !canRedo && styles.historyBtnDisabled]}
              accessibilityLabel="Yinele"
            >
              <Text style={[styles.historyBtnText, canRedo && styles.historyBtnTextOn]}>↪</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.brandTitle} pointerEvents="none">
          Lumeris
        </Text>
        <View style={[styles.toolbarSide, styles.toolbarSideRight]}>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setCompare(false);
              setExportOpen(true);
            }}
            style={styles.toolbarExport}
            accessibilityLabel="Export"
          >
            <Text style={styles.toolbarExportText}>Export</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.body, aiKeyboardOpen && styles.bodyKeyboard]}>
        {!aiKeyboardOpen ? (
        <View
          style={[
            styles.previewSlot,
            isLandscapeImage && styles.previewSlotLandscape,
            editorTab === 'ai' && styles.previewSlotAi,
            editorTab === 'ai' && isPortraitTall && styles.previewSlotPortrait,
          ]}
        >
          <View style={[styles.previewCard, { width: previewSize.w, height: previewSize.h }]}>
            {editorTab === 'looks' ? (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityHint="Basılı tutarak orijinal (ham) görüntüyü gösterir"
                onPressIn={() => setCompare(true)}
                onPressOut={() => setCompare(false)}
                style={styles.previewTouchLayer}
              >
                <EditorCanvas
                  uri={imageUri}
                  state={current}
                  compareBefore={compare}
                  width={previewSize.w}
                  height={previewSize.h}
                  canvasRef={canvasRef}
                />
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {!compare ? (
                    <View style={styles.beforePillWrap}>
                      <Text style={styles.beforePill}>LOOK</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityHint="Basılı tutarak orijinal (ham) görüntüyü gösterir"
                onPressIn={() => setCompare(true)}
                onPressOut={() => setCompare(false)}
                style={styles.previewTouchLayer}
              >
                <EditorCanvas
                  uri={imageUri}
                  state={current}
                  compareBefore={compare}
                  width={previewSize.w}
                  height={previewSize.h}
                  canvasRef={canvasRef}
                />
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {!compare ? (
                    <View style={styles.beforePillWrap}>
                      <Text style={styles.beforePill}>HAZIR</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            )}
          </View>
        </View>
        ) : null}
        <View
          style={[
            styles.unifiedSheet,
            aiKeyboardOpen
              ? [styles.unifiedSheetKeyboard, { top: toolbarApproxH, bottom: tabBarBottomOffset }]
              : { maxHeight: sheetMaxH },
          ]}
        >
          <ScrollView
            ref={sheetScrollRef}
            style={[
              styles.sheetScroll,
              { maxHeight: aiScrollMaxH ?? sheetScrollMaxH },
            ]}
            contentContainerStyle={[
              styles.sheetScrollContent,
              aiKeyboardOpen && { paddingBottom: sheetTabChromeH + 8 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
          >
            <View style={editorTab !== 'ai' ? styles.tabHidden : undefined}>
              <StyleTriadPanel
                imageUri={imageUri}
                apiBaseUrl={apiBase}
                baselineState={aiBaseline ?? current}
                aiTabActive={editorTab === 'ai'}
                onTouchEdit={touchEdit}
                onApply={(next) => commitReplace(next)}
                onBeginSuggest={handleAiBeginSuggest}
                onPromptFocus={scrollAiPromptIntoView}
              />
            </View>
            {editorTab === 'looks' ? (
              <>
                <View style={styles.looksPresetMetaRow}>
                  <Text style={styles.looksPresetMetaLeft} numberOfLines={1}>
                    PRESETS: DEEP MOSS COLLECTION
                  </Text>
                  <Text style={styles.looksPresetMetaRight}>{`${PRESET_NAMES.length} LOOKS AVAILABLE`}</Text>
                </View>
                <ScrollView
                  horizontal
                  nestedScrollEnabled
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
                          {on ? (
                            <View style={styles.presetSelectedBadge}>
                              <View style={styles.presetSelectedCheckMark} />
                            </View>
                          ) : null}
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
                      thumbTintColor={dark.accentOrganic}
                      minimumTrackTintColor={dark.primaryContainer}
                      maximumTrackTintColor={dark.surfaceBright}
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
            ) : editorTab === 'edit' ? (
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
                  ref={adjustToolsScrollRef}
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.adjustToolsScroll}
                  contentContainerStyle={styles.adjustToolStrip}
                >
                  {controlsInCategory.map((def) => {
                    const isOn = activeAdjust === def.key;
                    const iconColor = isOn ? dark.accentOrganic : dark.text;
                    return (
                      <Pressable
                        key={def.key}
                        style={styles.adjustIconCell}
                        onPress={() => {
                          touchEdit();
                          setActiveAdjust(def.key);
                        }}
                        accessibilityLabel={def.label}
                      >
                        <View style={[styles.adjustIconRing, isOn && styles.adjustIconRingOn]}>
                          <AdjustToolGlyph tool={def.key} color={iconColor} size={26} />
                        </View>
                        <Text style={[styles.adjustIconLabel, isOn && styles.adjustIconLabelOn]} numberOfLines={2}>
                          {ADJUST_SHORT_LABEL[def.key]}
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
                  thumbTintColor={dark.accentOrganic}
                  minimumTrackTintColor={dark.primaryContainer}
                  maximumTrackTintColor={dark.surfaceBright}
                  onChange={(v) => updateAdjustValue(activeControl.key, v)}
                  onSlidingStart={() => {
                    beginGesture();
                    touchEdit();
                  }}
                  onSlidingComplete={() => endGesture()}
                />
              </>
            ) : null}
          </ScrollView>
          <View
            style={[
              styles.sheetNavFooter,
              aiKeyboardOpen
                ? [
                    styles.sheetNavFooterPinned,
                    { paddingBottom: bottomNavPad, bottom: tabBarBottomOffset },
                  ]
                : { paddingBottom: bottomNavPad },
            ]}
          >
            <View style={styles.sheetNavDivider} />
            <View style={styles.sheetNavRow}>
              <Pressable
                style={[styles.navCell, editorTab === 'looks' && styles.navCellOn]}
                onPress={() => setTab('looks')}
                accessibilityLabel="Looks"
              >
                <LooksFlowerGlyph
                  color={editorTab === 'looks' ? dark.accentOrganic : dark.textMuted}
                  size={22}
                />
                <Text style={[styles.navLabel, editorTab === 'looks' && styles.navLabelOn]}>Looks</Text>
              </Pressable>
              <Pressable
                style={[styles.navCell, editorTab === 'edit' && styles.navCellOn]}
                onPress={() => setTab('edit')}
                accessibilityLabel="Adjust"
              >
                <SlidersNavGlyph
                  color={editorTab === 'edit' ? dark.onPrimaryContainer : dark.textMuted}
                  active={editorTab === 'edit'}
                  size={20}
                />
                <Text style={[styles.navLabel, editorTab === 'edit' && styles.navLabelOn]}>Adjust</Text>
              </Pressable>
              <Pressable
                style={[styles.navCell, editorTab === 'ai' && styles.navCellOn]}
                onPress={() => setTab('ai')}
                accessibilityLabel="AI Style Triad"
              >
                <AiSparkGlyph
                  color={editorTab === 'ai' ? dark.accentOrganic : dark.textMuted}
                  size={20}
                />
                <Text style={[styles.navLabel, editorTab === 'ai' && styles.navLabelOn]}>AI</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <Modal visible={exportOpen} animationType="slide" transparent onRequestClose={() => setExportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setExportOpen(false)} accessibilityLabel="Kapat">
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
              <Text style={styles.modalBrand}>Lumeris</Text>
              <View style={{ width: 28 }} />
            </View>

            {exportPreviewUri ? (
              <Image source={{ uri: exportPreviewUri }} style={styles.modalPreview} resizeMode="contain" />
            ) : (
              <View style={[styles.modalPreview, styles.modalPreviewLoadingBox]}>
                <ActivityIndicator color={dark.primary} size="large" />
              </View>
            )}
            {exportPreviewLoading ? <Text style={styles.modalPreviewHint}>Önizleme hazırlanıyor…</Text> : null}

            <Text style={styles.modalSectionLabel}>ÇÖZÜNÜRLÜK</Text>
            <View style={styles.segmentRow}>
              {(['standard', 'high', 'maximum'] as const).map((q) => {
                const preset = EXPORT_QUALITY_PRESETS[q];
                const on = exportQuality === q;
                return (
                  <Pressable
                    key={q}
                    onPress={() => setExportQuality(q)}
                    style={[styles.segment, on && styles.segmentOn]}
                  >
                    <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{preset.label}</Text>
                    <Text style={[styles.segmentSub, on && styles.segmentSubOn]}>{preset.hint}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalSectionLabel}>BOYUT</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.aspectStrip}
            >
              {EXPORT_ASPECT_OPTIONS.map((option) => {
                const on = exportAspect === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setExportAspect(option.id)}
                    style={[styles.aspectChip, on && styles.aspectChipOn]}
                  >
                    <Text style={[styles.aspectChipText, on && styles.aspectChipTextOn]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.modalHint}>
              {exportLayout
                ? `Çıktı: ${exportLayout.outputLabel} px · önizleme ile aynı görünüm · merkez kırpma`
                : 'Boyut seçimi dışa aktarmada merkez kırpma olarak uygulanır.'}
            </Text>

            <View style={styles.exportActionRow}>
              <Pressable
                style={[styles.modalSave, styles.modalSaveHalf, exporting && styles.disabled]}
                disabled={exporting}
                onPress={() => void exportImage()}
              >
                <Text style={styles.modalSaveText}>{exporting ? '…' : 'Galeriye kaydet'}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalShare, exporting && styles.disabled]}
                disabled={exporting}
                onPress={() => void shareExport()}
              >
                <Text style={styles.modalShareText}>{exporting ? '…' : 'Paylaş'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <EditorSideMenu
        visible={menuOpen}
        topInset={topInset}
        favoriteCount={favoriteCount}
        onClose={() => setMenuOpen(false)}
        onSaveFavorite={openSaveRecipe}
        onOpenFavorites={openRecipesList}
        onExit={onBack}
      />

      <SaveRecipeModal
        visible={saveOpen}
        defaultName={saveDefaultName}
        saving={savingRecipe}
        onClose={() => {
          if (!savingRecipe) setSaveOpen(false);
        }}
        onSave={(name) => void handleSaveRecipe(name)}
      />
      <SavedRecipesModal
        visible={recipesOpen}
        onClose={() => setRecipesOpen(false)}
        onApply={(state) => handleApplyRecipe(state)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: dark.bg,
  },
  toolbarSide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 124,
    gap: 0,
  },
  historyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  historyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnDisabled: {
    opacity: 0.28,
  },
  historyBtnText: {
    fontSize: 22,
    lineHeight: 24,
    color: dark.textDisabled,
  },
  historyBtnTextOn: {
    color: dark.textMuted,
  },
  toolbarSideRight: {
    justifyContent: 'flex-end',
  },
  toolbarExport: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  toolbarExportText: {
    color: dark.text,
    fontSize: 15,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
  },
  toolIcon: { paddingHorizontal: 4, paddingVertical: 6 },
  menuIcon: { flexDirection: 'column', justifyContent: 'center', gap: 4, paddingVertical: 2 },
  menuLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: dark.text,
  },
  brandTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: dark.text,
    fontSize: 17,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.2,
  },
  disabled: { opacity: 0.35 },
  body: { flex: 1 },
  bodyKeyboard: { position: 'relative', overflow: 'visible' },
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
  previewSlotAi: {
    minHeight: 0,
    overflow: 'hidden',
  },
  previewSlotPortrait: {
    justifyContent: 'center',
    paddingTop: 4,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: dark.canvas,
    alignSelf: 'center',
  },
  previewTouchLayer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  beforePillWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  beforePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.48)',
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
  },
  unifiedSheet: {
    flexShrink: 0,
    marginTop: 2,
    backgroundColor: dark.bgElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: dark.divider,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -2 },
      },
      android: { elevation: 4 },
    }),
  },
  unifiedSheetKeyboard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginTop: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'visible',
  },
  sheetNavFooter: {
    backgroundColor: dark.bgElevated,
  },
  sheetNavFooterPinned: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 0,
  },
  sheetScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  tabHidden: {
    display: 'none',
  },
  sheetNavDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: dark.divider,
    marginHorizontal: 16,
    opacity: 1,
  },
  sheetNavRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 6,
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    marginTop: 12,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  categoryChipOn: {
    borderWidth: 0,
    backgroundColor: 'rgba(62, 75, 67, 0.55)',
  },
  categoryChipText: {
    color: dark.textMuted,
    fontSize: 11,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.5,
  },
  categoryChipTextOn: { color: dark.onPrimaryContainer },
  looksPresetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  looksPresetMetaLeft: {
    flex: 1,
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 1.3,
    color: dark.textMuted,
  },
  looksPresetMetaRight: {
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    color: dark.textMuted,
  },
  adjustToolsScroll: {
    flexGrow: 0,
  },
  adjustToolStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 12,
  },
  adjustIconCell: {
    minWidth: 58,
    maxWidth: 76,
    alignItems: 'center',
    paddingVertical: 2,
  },
  adjustIconRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  adjustIconRingOn: {
    borderColor: 'rgba(132,165,157,0.55)',
    backgroundColor: 'rgba(62,75,67,0.35)',
  },
  adjustIconLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: dark.textMuted,
    textAlign: 'center',
  },
  adjustIconLabelOn: {
    color: dark.accentOrganic,
    fontFamily: fonts.bold,
  },
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
    position: 'relative',
    overflow: 'visible',
  },
  presetTileInnerOn: {
    borderWidth: 2,
    borderColor: dark.accentOrganic,
    shadowColor: dark.accentOrganic,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  presetSelectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: dark.accentOrganic,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(9,16,12,0.35)',
  },
  presetSelectedCheckMark: {
    width: 5,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: dark.onPrimary,
    transform: [{ rotate: '45deg' }],
    marginTop: -3,
    marginLeft: -1,
  },
  presetName: {
    marginTop: 6,
    fontSize: 9,
    color: dark.textDim,
    maxWidth: 64,
    textAlign: 'center',
  },
  presetNameOn: { color: dark.onPrimaryContainer, fontFamily: fonts.bold },
  presetTileLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
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
  navCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  navCellOn: {
    backgroundColor: 'rgba(62, 75, 67, 0.45)',
    borderWidth: 0,
  },
  navLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    color: dark.textMuted,
    marginTop: 4,
  },
  navLabelOn: { color: dark.accentOrganic },
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: dark.divider,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalClose: { color: dark.textMuted, fontSize: 18, padding: 8 },
  modalBrand: { color: dark.text, fontSize: 16, fontFamily: fonts.semiBold, letterSpacing: 0.2 },
  modalPreview: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: dark.canvas,
    marginBottom: 16,
  },
  modalPreviewLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPreviewHint: {
    marginTop: -10,
    marginBottom: 12,
    color: dark.textDim,
    fontSize: 11,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 1.4,
    color: dark.textMuted,
    marginBottom: 8,
  },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 33, 29, 0.55)',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  segmentOn: {
    backgroundColor: dark.primary,
    borderColor: dark.primary,
  },
  segmentText: { fontSize: 13, fontFamily: fonts.bold, color: dark.textMuted },
  segmentTextOn: { color: dark.onPrimary },
  segmentSub: { fontSize: 10, fontFamily: fonts.medium, color: dark.textDim, marginTop: 2 },
  segmentSubOn: { color: 'rgba(232, 240, 236, 0.82)' },
  aspectStrip: { flexDirection: 'row', gap: 8, paddingVertical: 2, paddingRight: 8, marginBottom: 16 },
  aspectChip: {
    minWidth: 58,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 33, 29, 0.55)',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  aspectChipOn: {
    backgroundColor: dark.primary,
    borderColor: dark.primary,
  },
  aspectChipText: { fontSize: 12, fontFamily: fonts.bold, color: dark.textMuted },
  aspectChipTextOn: { color: dark.onPrimary },
  modalHint: { fontSize: 11, color: dark.textDim, marginBottom: 16, lineHeight: 16 },
  exportActionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  modalSave: {
    backgroundColor: dark.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalSaveHalf: { flex: 1 },
  modalSaveText: { color: dark.onPrimary, fontSize: 15, fontFamily: fonts.bold },
  modalShare: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(26, 33, 29, 0.65)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  modalShareText: { color: dark.text, fontSize: 15, fontFamily: fonts.bold },
});
