import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { pickRandomWelcomeHeroUri } from '../data/heroPhotos';
import { createDefaultWelcomeExperience, type WelcomeExperience } from '../data/welcomeExperience';
import { getLumerisApiBaseUrl } from '../lib/apiBaseUrl';
import { fetchWelcomeExperience } from '../lib/fetchExperience';
import { dark } from '../theme/colors';
import { fonts } from '../theme/typography';

type HeroSource = { kind: 'remote'; uri: string } | { kind: 'local' };

const isExpoGo = Constants.executionEnvironment === 'storeClient';
/** Expo Go Android: MediaLibrary foto listesi desteklenmiyor (Expo kısıtı); yalnızca foto seçici kullanılabilir. */
const isExpoGoAndroid = isExpoGo && Platform.OS === 'android';

type Props = {
  onImageSelected: (uri: string) => void;
};

type Perm = 'unknown' | 'granted' | 'denied' | 'limited' | 'preview_unavailable';

function isMediaLibraryReadable(r: MediaLibrary.PermissionResponse): boolean {
  if (r.granted || r.status === MediaLibrary.PermissionStatus.GRANTED) return true;
  if (r.accessPrivileges === 'limited') return true;
  return false;
}

function mediaLibGranularPhoto(): MediaLibrary.GranularPermission[] | undefined {
  return Platform.OS === 'android' ? ['photo'] : undefined;
}

export function WelcomeScreen({ onImageSelected }: Props) {
  const [perm, setPerm] = useState<Perm>('unknown');
  const [thumbs, setThumbs] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [experience, setExperience] = useState<WelcomeExperience>(() => createDefaultWelcomeExperience());
  const [experienceLive, setExperienceLive] = useState(false);
  const [heroSource, setHeroSource] = useState<HeroSource>(() => ({ kind: 'remote', uri: pickRandomWelcomeHeroUri() }));
  const [heroReady, setHeroReady] = useState(false);
  const apiBase = useMemo(() => getLumerisApiBaseUrl(), []);

  const loadRecentAssets = useCallback(async (opts?: { silent?: boolean }) => {
    if (isExpoGoAndroid) {
      setThumbs([]);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 24,
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      setThumbs(page.assets);
    } catch {
      setThumbs([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const refreshGalleryFromSystem = useCallback(
    async (silent: boolean) => {
      if (isExpoGoAndroid) {
        setPerm('preview_unavailable');
        setThumbs([]);
        if (!silent) setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const granular = mediaLibGranularPhoto();
        const r = await MediaLibrary.getPermissionsAsync(false, granular);
        if (!isMediaLibraryReadable(r)) {
          setPerm(r.status === MediaLibrary.PermissionStatus.DENIED ? 'denied' : 'unknown');
          setThumbs([]);
          return;
        }
        setPerm(r.accessPrivileges === 'limited' ? 'limited' : 'granted');
        await loadRecentAssets({ silent: true });
      } catch {
        setPerm('unknown');
        setThumbs([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [loadRecentAssets],
  );

  const openImagePicker = useCallback(async () => {
    const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
    const curExt = cur as ImagePicker.MediaLibraryPermissionResponse;
    const libOk = cur.granted || cur.status === 'granted' || curExt.accessPrivileges === 'limited';
    if (!libOk) {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const reqExt = req as ImagePicker.MediaLibraryPermissionResponse;
      const reqOk = req.granted || req.status === 'granted' || reqExt.accessPrivileges === 'limited';
      if (!reqOk) {
        Alert.alert('Galeri izni', 'Fotoğraf seçmek için galeri erişimine izin verin.');
        return;
      }
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!r.canceled && r.assets[0]?.uri) onImageSelected(r.assets[0].uri);
  }, [onImageSelected]);

  const requestGalleryAccess = useCallback(async () => {
    if (isExpoGoAndroid) {
      await openImagePicker();
      return;
    }
    setLoading(true);
    try {
      const granular = mediaLibGranularPhoto();
      const r = await MediaLibrary.requestPermissionsAsync(false, granular);
      if (!isMediaLibraryReadable(r)) {
        setPerm('denied');
        setThumbs([]);
        return;
      }
      setPerm(r.accessPrivileges === 'limited' ? 'limited' : 'granted');
      await loadRecentAssets({ silent: true });
    } catch {
      setPerm('denied');
      setThumbs([]);
    } finally {
      setLoading(false);
    }
  }, [loadRecentAssets, openImagePicker]);

  useEffect(() => {
    void refreshGalleryFromSystem(false);
  }, [refreshGalleryFromSystem]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshGalleryFromSystem(true);
    });
    return () => sub.remove();
  }, [refreshGalleryFromSystem]);

  useEffect(() => {
    if (!apiBase) return;
    let cancelled = false;
    void (async () => {
      const remote = await fetchWelcomeExperience(apiBase);
      if (!cancelled && remote) {
        setExperience(remote);
        setExperienceLive(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    if (heroSource.kind === 'local') setHeroReady(true);
  }, [heroSource.kind]);

  const openSettings = () => {
    void Linking.openSettings();
  };

  const pickImage = () => void openImagePicker();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const tipsPreview = experience.tips.slice(0, 3);

  const largeThumb = thumbs[0];
  const gridThumbs = thumbs.slice(1, 5);
  const gridSlots: (MediaLibrary.Asset | null)[] = [
    ...gridThumbs,
    ...Array.from({ length: Math.max(0, 4 - gridThumbs.length) }, () => null),
  ].slice(0, 4) as (MediaLibrary.Asset | null)[];

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>Lumeris</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroFrame}>
          <View style={styles.hero}>
            {heroSource.kind === 'remote' ? (
              <>
                <Image
                  source={{ uri: heroSource.uri }}
                  style={styles.heroImage}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                  onLoad={() => setHeroReady(true)}
                  onError={() => {
                    setHeroSource({ kind: 'local' });
                    setHeroReady(true);
                  }}
                />
                {!heroReady ? (
                  <View style={styles.heroPlaceholder}>
                    <ActivityIndicator color={dark.primary} />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.heroImage, styles.heroOfflineRoot]} accessibilityLabel="Çevrimdışı arka plan">
                <View style={styles.heroOfflineGlow} />
                <View style={styles.heroOfflineBandTop} />
                <View style={styles.heroOfflineBandBottom} />
                <View style={styles.heroOfflineBadge} pointerEvents="none">
                  <Text style={styles.heroOfflineBadgeText}>Çevrimdışı</Text>
                </View>
              </View>
            )}
            <View style={styles.heroEdgeTop} pointerEvents="none" />
            <View style={styles.heroVignetteBottom} pointerEvents="none" />
            <View style={styles.heroScrim} pointerEvents="none" />
            <Text style={styles.heroTitle}>Işığınızı Keşfedin</Text>
            <Text style={styles.heroSub}>
              Analog tarzı düzenleme — kayıt yok, reklam yok. İşlem cihazınızda kalır.
            </Text>
            <Pressable style={styles.heroCta} onPress={pickImage} accessibilityLabel="Düzenlemeye başla">
              <Text style={styles.heroCtaText}>Başla</Text>
            </Pressable>
          </View>
        </View>

        {heroSource.kind === 'local' ? (
          <Text style={styles.heroOfflineNote}>İnternet olduğunda üstte yeni bir görsel yüklenir.</Text>
        ) : null}

        <Text style={styles.sectionLabel}>NEDEN LUMERIS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillarRow}>
          {experience.pillars.map((p) => (
            <View key={p.id} style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>{p.icon}</Text>
              <Text style={styles.pillarTitle} numberOfLines={2}>
                {p.title}
              </Text>
              <Text style={styles.pillarSub} numberOfLines={2}>
                {p.subtitle}
              </Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.tagline}>{experience.tagline}</Text>

        <View style={styles.spotlight}>
          <Text style={styles.spotBadge}>{experience.spotlight.badge}</Text>
          <Text style={styles.spotTitle}>{experience.spotlight.title}</Text>
          <Text style={styles.spotBody} numberOfLines={2}>
            {experience.spotlight.body}
          </Text>
        </View>

        <View style={styles.permCard}>
          <Text style={styles.permIcon}>🛡</Text>
          <View style={styles.permMid}>
            <Text style={styles.permTitle}>Galeri</Text>
            <Text style={styles.permSub}>Son fotoğraflar — önizleme</Text>
            {isExpoGo ? (
              <Text style={styles.permExpoHint}>
                {isExpoGoAndroid
                  ? "Expo Go (Android): son fotoğraf ızgarası desteklenmiyor; izinler Expo Go'ya verilir. Fotoğraf için üstteki Başla veya aşağıdaki Fotoğraf seç."
                  : 'Expo Go: izinler Expo Go uygulamasına verilir; Ayarlar → Uygulamalar → Expo Go.'}
              </Text>
            ) : null}
          </View>
          {perm === 'preview_unavailable' ? (
            <Pressable onPress={() => void openImagePicker()}>
              <Text style={styles.permAction}>Fotoğraf seç</Text>
            </Pressable>
          ) : perm === 'unknown' || perm === 'denied' ? (
            <Pressable onPress={() => void requestGalleryAccess()}>
              <Text style={styles.permAction}>İzin ver</Text>
            </Pressable>
          ) : (
            <Text style={styles.permOk}>Açık</Text>
          )}
        </View>

        {perm === 'denied' && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Galeri kapalı. Ayarlardan açabilirsiniz.</Text>
            <View style={styles.bannerRow}>
              <Pressable style={styles.bannerBtn} onPress={openSettings}>
                <Text style={styles.bannerBtnText}>Ayarlar</Text>
              </Pressable>
              <Pressable style={styles.bannerBtnGhost} onPress={() => void requestGalleryAccess()}>
                <Text style={styles.bannerBtnGhostText}>Tekrar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {perm === 'limited' && <Text style={styles.limited}>Sınırlı galeri erişimi</Text>}

        {loading ? (
          <ActivityIndicator size="large" color={dark.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.masonry}>
            {largeThumb ? (
              <Pressable onPress={() => onImageSelected(largeThumb.uri)} style={styles.heroThumbWrap}>
                <Image source={{ uri: largeThumb.uri }} style={styles.heroThumb} />
              </Pressable>
            ) : (
              <View style={[styles.heroThumbWrap, styles.placeholder]}>
                <Text style={styles.placeholderText}>Galeriden veya yukarıdan başlayın</Text>
              </View>
            )}
            <View style={styles.grid4}>
              {[0, 1].map((row) => (
                <View key={row} style={styles.gridRow}>
                  {[0, 1].map((col) => {
                    const t = gridSlots[row * 2 + col];
                    return t ? (
                      <Pressable key={t.id} onPress={() => onImageSelected(t.uri)} style={styles.gridCell}>
                        <Image source={{ uri: t.uri }} style={styles.gridImg} />
                      </Pressable>
                    ) : (
                      <View key={`e-${row}-${col}`} style={[styles.gridCell, styles.placeholderSmall]} />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>KISA İPUÇLARI</Text>
        <View style={styles.tipsRow}>
          {tipsPreview.map((t) => (
            <View key={t.id} style={[styles.tipCard, { flex: 1, minWidth: 0 }]}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipBody}>{t.body}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.version}>
          v{appVersion}
          {experienceLive ? ' · canlı içerik' : ''}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dark.divider,
  },
  brand: { color: dark.text, fontSize: 15, fontFamily: fonts.semiBold, letterSpacing: 0.4 },
  scroll: { paddingBottom: 32 },
  heroFrame: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
    }),
  },
  hero: {
    minHeight: 300,
    justifyContent: 'flex-end',
    padding: 22,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  heroOfflineRoot: {
    backgroundColor: dark.surface,
  },
  heroOfflineGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(227,213,202,0.08)',
  },
  heroOfflineBandTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  heroOfflineBandBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  heroOfflineBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroOfflineBadgeText: {
    color: dark.text,
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.8,
  },
  heroOfflineNote: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 2,
    textAlign: 'center',
    color: dark.textDim,
    fontSize: 12,
    fontFamily: fonts.regular,
    lineHeight: 17,
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: dark.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEdgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  heroVignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,14,11,0.18)',
  },
  heroTitle: {
    color: dark.text,
    fontSize: 28,
    fontFamily: fonts.bold,
    marginBottom: 8,
    letterSpacing: 0.56,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroSub: {
    color: 'rgba(242,233,228,0.92)',
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 21,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroCta: {
    backgroundColor: dark.primary,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: dark.accentGlow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  heroCtaText: {
    color: dark.onPrimary,
    fontSize: 15,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 1.4,
    color: dark.textMuted,
  },
  pillarRow: { gap: 12, paddingHorizontal: 20, paddingBottom: 4 },
  pillarCard: {
    width: 200,
    padding: 16,
    borderRadius: 18,
    backgroundColor: dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  pillarIcon: { fontSize: 20, color: dark.accentOrganic, marginBottom: 8 },
  pillarTitle: {
    color: dark.text,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    marginBottom: 4,
  },
  pillarSub: {
    color: dark.textMuted,
    fontSize: 11,
    fontFamily: fonts.regular,
    lineHeight: 15,
  },
  tagline: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
  },
  spotlight: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 0,
    backgroundColor: 'rgba(22, 29, 25, 0.72)',
  },
  spotBadge: {
    alignSelf: 'flex-start',
    color: dark.onPrimary,
    backgroundColor: dark.primary,
    fontSize: 9,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  spotTitle: { color: dark.text, fontSize: 17, fontFamily: fonts.bold, marginBottom: 6 },
  spotBody: {
    color: dark.textMuted,
    fontSize: 12,
    fontFamily: fonts.regular,
    lineHeight: 17,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: dark.surface,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  permIcon: { fontSize: 22, marginRight: 12 },
  permMid: { flex: 1 },
  permTitle: { color: dark.text, fontSize: 15, fontFamily: fonts.semiBold },
  permSub: { color: dark.textMuted, fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  permExpoHint: {
    color: dark.textDim,
    fontSize: 10,
    fontFamily: fonts.regular,
    lineHeight: 14,
    marginTop: 6,
  },
  permAction: { color: dark.accentOrganic, fontSize: 14, fontFamily: fonts.bold },
  permOk: { color: dark.textMuted, fontSize: 13, fontFamily: fonts.semiBold },
  banner: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    backgroundColor: 'rgba(22, 29, 25, 0.85)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  bannerText: { color: dark.text, fontSize: 13, fontFamily: fonts.regular, marginBottom: 10 },
  bannerRow: { flexDirection: 'row', gap: 10 },
  bannerBtn: {
    flex: 1,
    backgroundColor: dark.primary,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  bannerBtnText: { color: dark.onPrimary, fontFamily: fonts.bold },
  bannerBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  bannerBtnGhostText: { color: dark.text, fontFamily: fonts.semiBold },
  limited: { marginHorizontal: 20, marginTop: 10, fontSize: 12, color: dark.textMuted, fontFamily: fonts.regular },
  masonry: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },
  heroThumbWrap: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: dark.canvas,
  },
  heroThumb: { width: '100%', height: '100%' },
  grid4: { gap: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  gridCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  gridImg: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  placeholderText: {
    color: dark.textMuted,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  placeholderSmall: {
    backgroundColor: dark.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  tipsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'stretch',
  },
  tipCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  tipTitle: {
    color: dark.text,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    marginBottom: 6,
  },
  tipBody: {
    color: dark.textMuted,
    fontSize: 11,
    fontFamily: fonts.regular,
    lineHeight: 16,
    flexShrink: 1,
  },
  version: {
    textAlign: 'center',
    color: dark.textDim,
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: 12,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
});
