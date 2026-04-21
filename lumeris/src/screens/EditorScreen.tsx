import { ImageFormat, useCanvasRef } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EditorCanvas } from '../components/EditorCanvas';
import { SliderRow } from '../components/SliderRow';
import { HSL_LABELS } from '../engine/editState';
import { PRESET_NAMES } from '../engine/presets';
import { useUndoableEditState } from '../hooks/useUndoableEditState';
import { recordFirstEditIfNeeded } from '../lib/kpi';
import { theme } from '../theme/colors';

const { width: WIN_W } = Dimensions.get('window');
const PREVIEW_H = Math.round(WIN_W * 1.05);

type Props = {
  imageUri: string;
  onBack: () => void;
};

export function EditorScreen({ imageUri, onBack }: Props) {
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

  const [compare, setCompare] = useState(false);
  const [exporting, setExporting] = useState(false);

  const touchEdit = useCallback(() => {
    void recordFirstEditIfNeeded();
  }, []);

  const exportImage = useCallback(async () => {
    setExporting(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Fotoğrafı kaydetmek için medya kitaplığı izni verin.');
        return;
      }
      const snap = canvasRef.current?.makeImageSnapshot();
      if (!snap) {
        Alert.alert('Dışa aktarma', 'Görüntü oluşturulamadı. Tekrar deneyin.');
        return;
      }
      const base64 = snap.encodeToBase64(ImageFormat.JPEG, 92);
      const path = `${FileSystem.cacheDirectory ?? ''}lumeris_export_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await MediaLibrary.saveToLibraryAsync(path);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Kaydedildi', 'Fotoğraf galerinize eklendi. EXIF koruma düzeyi cihaza bağlıdır.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Dışa aktarma başarısız.');
    } finally {
      setExporting(false);
    }
  }, [canvasRef]);

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable onPress={onBack} style={styles.toolBtn} accessibilityLabel="Geri">
          <Text style={styles.toolBtnText}>←</Text>
        </Pressable>
        <View style={styles.toolMid}>
          <Pressable
            onPress={undo}
            disabled={!canUndo}
            style={[styles.toolBtn, !canUndo && styles.disabled]}
            accessibilityLabel="Geri al"
          >
            <Text style={styles.toolBtnText}>Geri al</Text>
          </Pressable>
          <Pressable
            onPress={redo}
            disabled={!canRedo}
            style={[styles.toolBtn, !canRedo && styles.disabled]}
            accessibilityLabel="Yinele"
          >
            <Text style={styles.toolBtnText}>Yinele</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => void exportImage()}
          disabled={exporting}
          style={styles.saveBtn}
          accessibilityLabel="Galeriye kaydet"
        >
          <Text style={styles.saveBtnText}>{exporting ? '…' : 'Kaydet'}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="imagebutton"
        accessibilityHint="Basılı tutarak orijinali gösterir"
        onPressIn={() => setCompare(true)}
        onPressOut={() => setCompare(false)}
        style={styles.previewWrap}
      >
        <EditorCanvas
          uri={imageUri}
          state={current}
          compare={compare}
          width={WIN_W}
          height={PREVIEW_H}
          canvasRef={canvasRef}
        />
        <Text style={styles.compareHint}>Basılı tut — karşılaştır</Text>
      </Pressable>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.section}>Analog ön ayarlar</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
          {PRESET_NAMES.map((name, idx) => (
            <Pressable
              key={name}
              onPress={() => {
                touchEdit();
                commitReplace({ ...current, presetIndex: idx });
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.presetChip, current.presetIndex === idx && styles.presetChipOn]}
            >
              <Text style={[styles.presetChipText, current.presetIndex === idx && styles.presetChipTextOn]}>
                {name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <SliderRow
          label="Ön ayar yoğunluğu (0–100)"
          value={current.presetIntensity}
          min={0}
          max={100}
          step={1}
          format={(v) => `${Math.round(v)}`}
          onChange={(v) => update((c) => ({ ...c, presetIntensity: v }))}
          onSlidingStart={() => {
            beginGesture();
            touchEdit();
          }}
          onSlidingComplete={() => endGesture()}
        />

        <Text style={styles.section}>Temel</Text>
        <SliderRow
          label="Pozlama (EV)"
          value={current.exposure}
          min={-2}
          max={2}
          step={0.05}
          onChange={(v) => update((c) => ({ ...c, exposure: v }))}
          onSlidingStart={() => {
            beginGesture();
            touchEdit();
          }}
          onSlidingComplete={() => endGesture()}
        />
        <SliderRow
          label="Kontrast"
          value={current.contrast}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(v) => update((c) => ({ ...c, contrast: v }))}
          onSlidingStart={beginGesture}
          onSlidingComplete={endGesture}
        />
        <SliderRow
          label="Doygunluk"
          value={current.saturation}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => update((c) => ({ ...c, saturation: v }))}
          onSlidingStart={beginGesture}
          onSlidingComplete={endGesture}
        />
        <SliderRow
          label="Sıcaklık"
          value={current.temperature}
          min={-1}
          max={1}
          step={0.02}
          onChange={(v) => update((c) => ({ ...c, temperature: v }))}
          onSlidingStart={beginGesture}
          onSlidingComplete={endGesture}
        />
        <SliderRow
          label="Keskinlik (yakında)"
          value={current.sharpness}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => update((c) => ({ ...c, sharpness: v }))}
          onSlidingStart={beginGesture}
          onSlidingComplete={endGesture}
        />
        <SliderRow
          label="Solma (fade)"
          value={current.fade}
          min={0}
          max={1}
          step={0.02}
          onChange={(v) => update((c) => ({ ...c, fade: v }))}
          onSlidingStart={beginGesture}
          onSlidingComplete={endGesture}
        />
        <SliderRow
          label="Vignette"
          value={current.vignette}
          min={0}
          max={1}
          step={0.02}
          onChange={(v) => update((c) => ({ ...c, vignette: v }))}
          onSlidingStart={beginGesture}
          onSlidingComplete={endGesture}
        />
        <SliderRow
          label="Grain"
          value={current.grain}
          min={0}
          max={1}
          step={0.02}
          onChange={(v) => update((c) => ({ ...c, grain: v }))}
          onSlidingStart={beginGesture}
          onSlidingComplete={endGesture}
        />

        <Text style={styles.section}>HSL (8 renk)</Text>
        {HSL_LABELS.map((label, idx) => (
          <View key={label} style={styles.hslBlock}>
            <Text style={styles.hslTitle}>{label}</Text>
            <SliderRow
              label="Ton"
              value={current.hsl[idx].h}
              min={-100}
              max={100}
              step={1}
              format={(v) => `${Math.round(v)}`}
              onChange={(v) =>
                update((c) => {
                  const hsl = [...c.hsl];
                  hsl[idx] = { ...hsl[idx], h: v };
                  return { ...c, hsl };
                })
              }
              onSlidingStart={() => {
                beginGesture();
                touchEdit();
              }}
              onSlidingComplete={() => endGesture()}
            />
            <SliderRow
              label="Doygunluk"
              value={current.hsl[idx].s}
              min={-100}
              max={100}
              step={1}
              format={(v) => `${Math.round(v)}`}
              onChange={(v) =>
                update((c) => {
                  const hsl = [...c.hsl];
                  hsl[idx] = { ...hsl[idx], s: v };
                  return { ...c, hsl };
                })
              }
              onSlidingStart={beginGesture}
              onSlidingComplete={endGesture}
            />
            <SliderRow
              label="Parlaklık"
              value={current.hsl[idx].l}
              min={-100}
              max={100}
              step={1}
              format={(v) => `${Math.round(v)}`}
              onChange={(v) =>
                update((c) => {
                  const hsl = [...c.hsl];
                  hsl[idx] = { ...hsl[idx], l: v };
                  return { ...c, hsl };
                })
              }
              onSlidingStart={beginGesture}
              onSlidingComplete={endGesture}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.softGray },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 48,
    paddingBottom: 8,
    backgroundColor: theme.lilac,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  toolBtn: { padding: 10 },
  toolBtnText: { color: theme.text, fontWeight: '600', fontSize: 15 },
  toolMid: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  disabled: { opacity: 0.35 },
  saveBtn: {
    backgroundColor: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: { color: theme.lilac, fontWeight: '700' },
  previewWrap: {
    backgroundColor: '#000',
    alignItems: 'center',
  },
  compareHint: {
    position: 'absolute',
    bottom: 8,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 10,
    marginTop: 8,
  },
  presetRow: { marginBottom: 12 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  presetChipOn: {
    backgroundColor: theme.lilacDeep,
    borderColor: theme.lilacDeep,
  },
  presetChipText: { color: theme.text, fontSize: 13 },
  presetChipTextOn: { color: theme.text, fontWeight: '700' },
  hslBlock: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  hslTitle: { fontWeight: '700', color: theme.text, marginBottom: 6 },
});
