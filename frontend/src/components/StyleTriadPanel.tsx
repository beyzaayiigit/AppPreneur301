import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SliderRow } from './SliderRow';
import type { EditState } from '../engine/editState';
import { isAiConsentGranted, saveAiConsentGranted } from '../lib/aiConsentStorage';
import { apiEditToEditState, blendEditState, type StyleDirection } from '../lib/editRecipe';
import { fetchStyleSuggestions } from '../lib/fetchStyleSuggestions';
import { prepareAiThumbnail } from '../lib/prepareAiThumbnail';
import { dark } from '../theme/colors';
import { fonts } from '../theme/typography';

type Props = {
  imageUri: string;
  apiBaseUrl: string;
  baselineState: EditState;
  onApply: (state: EditState) => void;
  onTouchEdit: () => void;
  /** Yeni analiz isteği başlamadan önce — baseline anlık düzenlemeyle güncellenir */
  onBeginSuggest?: () => void;
  onPromptFocus?: (offsetY: number) => void;
  /** AI sekmesi görünür olduğunda onay popup'ı tetiklenir */
  aiTabActive?: boolean;
};

type Phase = 'idle' | 'loading' | 'ready' | 'error';

const LOADING_HINTS = [
  'Fotoğraf analiz ediliyor…',
  'Üç stil yönü oluşturuluyor…',
  'Sunucu uyanıyor olabilir, biraz sürebilir…',
];

const PROMPT_LINE_H = 20;
const PROMPT_PAD_V = 10;
const PROMPT_MIN_H = PROMPT_LINE_H + PROMPT_PAD_V * 2;
const PROMPT_MAX_H = PROMPT_LINE_H * 5 + PROMPT_PAD_V * 2;

export function StyleTriadPanel({
  imageUri,
  apiBaseUrl,
  baselineState,
  onApply,
  onTouchEdit,
  onBeginSuggest,
  onPromptFocus,
  aiTabActive = false,
}: Props) {
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [directions, setDirections] = useState<StyleDirection[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [source, setSource] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingHint, setLoadingHint] = useState(LOADING_HINTS[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [aiIntensity, setAiIntensity] = useState(100);
  const [promptHeight, setPromptHeight] = useState(PROMPT_MIN_H);
  const promptOffsetY = useRef(0);
  const wasAiTabActive = useRef(false);

  const clampPromptHeight = useCallback((contentH: number) => {
    return Math.min(PROMPT_MAX_H, Math.max(PROMPT_MIN_H, contentH));
  }, []);

  const showPromptForm = phase === 'idle' || phase === 'error' || (phase === 'loading' && directions.length === 0);
  const showResults = directions.length > 0 && (phase === 'ready' || phase === 'loading');

  useEffect(() => {
    if (!aiTabActive) {
      wasAiTabActive.current = false;
      return;
    }
    const enteringTab = !wasAiTabActive.current;
    wasAiTabActive.current = true;
    if (!enteringTab) return;

    void (async () => {
      const granted = await isAiConsentGranted();
      setConsentGranted(granted);
      if (!granted) setConsentModalOpen(true);
    })();
  }, [aiTabActive]);

  const handleConsentYes = useCallback(() => {
    void (async () => {
      await saveAiConsentGranted();
      setConsentGranted(true);
      setConsentModalOpen(false);
      setErrorMsg('');
    })();
  }, []);

  const handleConsentNo = useCallback(() => {
    setConsentGranted(false);
    setConsentModalOpen(false);
  }, []);

  const requireConsent = useCallback(() => {
    if (consentGranted) return true;
    setConsentModalOpen(true);
    setErrorMsg('AI analizi için onay gerekli.');
    return false;
  }, [consentGranted]);

  const runSuggest = useCallback(async () => {
    if (!requireConsent()) return;
    if (!apiBaseUrl) {
      setErrorMsg('API adresi yapılandırılmamış. EXPO_PUBLIC_LUMERIS_API_BASE_URL veya app.json');
      setPhase('error');
      return;
    }

    onBeginSuggest?.();
    setPhase('loading');
    setErrorMsg('');
    Keyboard.dismiss();
    setLoadingHint(LOADING_HINTS[0]);
    const hintTimer = setTimeout(() => setLoadingHint(LOADING_HINTS[1]), 4000);
    const coldTimer = setTimeout(() => setLoadingHint(LOADING_HINTS[2]), 12000);

    try {
      const { base64, mimeType } = await prepareAiThumbnail(imageUri);
      const result = await fetchStyleSuggestions(apiBaseUrl, {
        prompt: prompt.trim() || undefined,
        imageBase64: base64,
        mimeType,
      });

      if (!result.ok) {
        const messages: Record<string, string> = {
          no_base_url: 'API adresi eksik.',
          timeout: 'İstek zaman aşımına uğradı. Sunucu uyuyor olabilir; tekrar deneyin.',
          http: 'Sunucu hatası. Tekrar deneyin.',
          invalid: 'Geçersiz yanıt alındı.',
          network: 'Ağ hatası. Bağlantınızı ve API adresini kontrol edin.',
        };
        setErrorMsg(messages[result.error] ?? 'Bilinmeyen hata');
        setPhase(directions.length > 0 ? 'ready' : 'error');
        return;
      }

      setDirections(result.data.directions);
      setReasoning(result.data.reasoning_tr);
      setSource(result.data.source);
      setSelectedId(null);
      setAiIntensity(100);
      onApply(baselineState);
      setPhase('ready');
      onTouchEdit();
      Keyboard.dismiss();
    } catch {
      setErrorMsg('Önizleme hazırlanamadı.');
      setPhase(directions.length > 0 ? 'ready' : 'error');
    } finally {
      clearTimeout(hintTimer);
      clearTimeout(coldTimer);
    }
  }, [apiBaseUrl, baselineState, directions.length, imageUri, onApply, onBeginSuggest, onTouchEdit, prompt, requireConsent]);

  const openPromptForm = useCallback(() => {
    setPhase('idle');
    setErrorMsg('');
  }, []);

  const applyBlended = useCallback(
    (dir: StyleDirection, intensity: number) => {
      const target = apiEditToEditState(dir.edit);
      onApply(blendEditState(baselineState, target, intensity));
    },
    [baselineState, onApply],
  );

  const applyDirection = (dir: StyleDirection) => {
    if (selectedId === dir.id) {
      setSelectedId(null);
      setAiIntensity(100);
      onTouchEdit();
      onApply(baselineState);
      return;
    }
    setSelectedId(dir.id);
    setAiIntensity(100);
    onTouchEdit();
    applyBlended(dir, 100);
  };

  return (
    <View style={styles.wrap}>
      {showPromptForm ? (
        <>
          <Text style={styles.heading}>STYLE TRIAD</Text>
          <Text style={styles.sub}>
            AI fotoğrafınızı analiz eder ve 3 farklı stil yönü önerir. Düzenleme cihazınızda uygulanır.
          </Text>

          <View
            onLayout={(e) => {
              promptOffsetY.current = e.nativeEvent.layout.y;
            }}
          >
            <TextInput
              style={[
                styles.input,
                styles.inputText,
                { height: clampPromptHeight(promptHeight) },
                phase === 'loading' && styles.inputLocked,
              ]}
              placeholder="Örn: mat grenli 90'lar film portresi"
              placeholderTextColor={dark.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              editable={phase !== 'loading'}
              multiline
              maxLength={500}
              textAlignVertical={promptHeight > PROMPT_MIN_H + 2 ? 'top' : 'center'}
              scrollEnabled={promptHeight >= PROMPT_MAX_H}
              autoCorrect
              autoCapitalize="sentences"
              keyboardAppearance="dark"
              cursorColor={dark.primary}
              selectionColor={dark.accentOrganic}
              underlineColorAndroid="transparent"
              onContentSizeChange={(e) => {
                setPromptHeight(clampPromptHeight(e.nativeEvent.contentSize.height));
              }}
              onFocus={() => onPromptFocus?.(promptOffsetY.current)}
            />
          </View>

          <Pressable
            style={[styles.cta, phase === 'loading' && styles.ctaLoading]}
            onPress={() => void runSuggest()}
            disabled={phase === 'loading'}
            accessibilityLabel={phase === 'loading' ? loadingHint : '3 stil öner'}
          >
            {phase === 'loading' ? (
              <View style={styles.ctaLoadingRow}>
                <ActivityIndicator color={dark.onPrimaryContainer} size="small" />
                <Text style={styles.ctaLoadingText} numberOfLines={2}>
                  {loadingHint}
                </Text>
              </View>
            ) : (
              <Text style={styles.ctaText}>3 stil öner</Text>
            )}
          </Pressable>

          {phase === 'error' && errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        </>
      ) : null}

      {showResults ? (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.heading}>STYLE TRIAD</Text>
            <View style={styles.resultsActions}>
              <Pressable
                style={styles.iconBtn}
                onPress={openPromptForm}
                accessibilityLabel="Promptu düzenle"
              >
                <Text style={styles.iconBtnText}>✎</Text>
              </Pressable>
              <Pressable
                style={[styles.iconBtn, phase === 'loading' && styles.iconBtnDisabled]}
                onPress={() => void runSuggest()}
                disabled={phase === 'loading'}
                accessibilityLabel="Yeniden öner"
              >
                {phase === 'loading' ? (
                  <ActivityIndicator color={dark.accentOrganic} size="small" />
                ) : (
                  <Text style={styles.iconBtnText}>↻</Text>
                )}
              </Pressable>
            </View>
          </View>

          {phase === 'loading' ? (
            <View style={styles.refreshLoadingRow}>
              <ActivityIndicator color={dark.accentOrganic} size="small" />
              <Text style={styles.refreshLoadingText} numberOfLines={2}>
                {loadingHint}
              </Text>
            </View>
          ) : null}
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <View style={styles.reasoningWrap}>
            <Text style={styles.reasoning}>{reasoning}</Text>
          </View>
          {source ? (
            <Text style={styles.reasoningSource}>
              {source === 'gemini' ? 'AI önerisi' : 'Çevrimdışı öneri'}
            </Text>
          ) : null}
          {source === 'fallback' ? (
            <Text style={styles.fallbackNote}>
              Gemini şu an yanıt veremedi (yoğunluk veya geçici kesinti). Çevrimdışı öneriler gösteriliyor; ↻ ile
              biraz sonra tekrar deneyin.
            </Text>
          ) : null}

          {selectedId && phase === 'ready' ? (
            <SliderRow
              appearance="dark"
              label="INTENSITY"
              value={aiIntensity}
              min={0}
              max={100}
              step={1}
              sliderRemountKey={`ai-intensity-${selectedId}`}
              thumbTintColor={dark.accentOrganic}
              minimumTrackTintColor={dark.primaryContainer}
              maximumTrackTintColor={dark.surfaceBright}
              format={(v) => `${Math.round(v)}`}
              onChange={(v) => {
                setAiIntensity(v);
                const dir = directions.find((d) => d.id === selectedId);
                if (dir) {
                  onTouchEdit();
                  applyBlended(dir, v);
                }
              }}
            />
          ) : null}

          <View style={[styles.cardRow, phase === 'loading' && styles.cardRowBusy]}>
            {directions.map((dir) => {
              const on = selectedId === dir.id;
              return (
                <Pressable
                  key={dir.id}
                  style={[styles.card, on && styles.cardOn]}
                  onPress={() => applyDirection(dir)}
                  disabled={phase === 'loading'}
                >
                  <Text style={[styles.cardLabel, on && styles.cardLabelOn]}>{dir.label}</Text>
                  <Text style={styles.cardTag}>{dir.tagline}</Text>
                  <Text style={styles.cardApply}>{on ? 'Sıfırla' : 'Uygula'}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Modal
        visible={consentModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleConsentNo}
      >
        <View style={styles.consentBackdrop}>
          <View style={styles.consentCard}>
            <Text style={styles.consentTitle}>AI analizi onayı</Text>
            <Text style={styles.consentBody}>
              Stil önerisi için düşük çözünürlüklü bir önizleme Google Gemini&apos;ye gönderilir. Tam
              çözünürlüklü fotoğraf yalnızca cihazınızda kalır ve düzenleme burada uygulanır.
            </Text>
            <View style={styles.consentActions}>
              <Pressable style={styles.consentBtnNo} onPress={handleConsentNo}>
                <Text style={styles.consentBtnNoText}>Hayır</Text>
              </Pressable>
              <Pressable style={styles.consentBtnYes} onPress={handleConsentYes}>
                <Text style={styles.consentBtnYesText}>Evet, kabul ediyorum</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 8 },
  heading: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: dark.textMuted,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: dark.text,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: dark.outline,
    backgroundColor: dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.6 },
  iconBtnText: {
    fontSize: 16,
    color: dark.accentOrganic,
    lineHeight: 18,
  },
  consentBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  consentCard: {
    backgroundColor: dark.bgElevated,
    borderRadius: 18,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.divider,
  },
  consentTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: dark.text,
    marginBottom: 10,
  },
  consentBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    marginBottom: 18,
  },
  consentActions: { flexDirection: 'row', gap: 10 },
  consentBtnNo: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.outline,
  },
  consentBtnNoText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: dark.textMuted,
  },
  consentBtnYes: {
    flex: 1.4,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: dark.primary,
  },
  consentBtnYesText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: dark.onPrimary,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: dark.outline,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: PROMPT_PAD_V,
    fontSize: 14,
    lineHeight: PROMPT_LINE_H,
    backgroundColor: dark.surfaceBright,
  },
  inputText: {
    color: dark.text,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  inputLocked: {
    opacity: 0.65,
  },
  cta: {
    backgroundColor: dark.primaryContainer,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaLoading: { opacity: 0.92 },
  ctaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  ctaText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: dark.onPrimaryContainer,
  },
  ctaLoadingText: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: dark.onPrimaryContainer,
    textAlign: 'center',
  },
  refreshLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  refreshLoadingText: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: dark.textMuted,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#e8a0a0',
    lineHeight: 17,
  },
  reasoningWrap: {
    flexShrink: 0,
    width: '100%',
  },
  reasoning: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: dark.text,
    flexWrap: 'wrap',
  },
  reasoningSource: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: dark.textMuted,
    marginTop: -4,
  },
  fallbackNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: '#d4b896',
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardRowBusy: { opacity: 0.72 },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.outline,
    backgroundColor: dark.surface,
    padding: 10,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  cardOn: {
    borderColor: dark.accentOrganic,
    backgroundColor: dark.surfaceBright,
  },
  cardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: dark.text,
    marginBottom: 4,
  },
  cardLabelOn: { color: dark.accentOrganic },
  cardTag: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: dark.textMuted,
    flexShrink: 1,
    width: '100%',
  },
  cardApply: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: dark.primary,
    marginTop: 8,
  },
});
