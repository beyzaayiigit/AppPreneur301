import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { dark } from '../theme/colors';

const heroImage = require('../../assets/splash-icon.png');

type Props = {
  onImageSelected: (uri: string) => void;
};

type Perm = 'unknown' | 'granted' | 'denied' | 'limited';

export function WelcomeScreen({ onImageSelected }: Props) {
  const [perm, setPerm] = useState<Perm>('unknown');
  const [thumbs, setThumbs] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecentAssets = useCallback(async () => {
    setLoading(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 24,
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      setThumbs(page.assets);
    } catch {
      setPerm('denied');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestGalleryAccess = useCallback(async () => {
    setLoading(true);
    try {
      const r = await MediaLibrary.requestPermissionsAsync();
      if (!r.granted) {
        setPerm('denied');
        setThumbs([]);
        return;
      }
      setPerm(r.accessPrivileges === 'limited' ? 'limited' : 'granted');
      await loadRecentAssets();
    } catch {
      setPerm('denied');
    } finally {
      setLoading(false);
    }
  }, [loadRecentAssets]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const r = await MediaLibrary.getPermissionsAsync();
        if (!r.granted) {
          setPerm('unknown');
          setThumbs([]);
          return;
        }
        setPerm(r.accessPrivileges === 'limited' ? 'limited' : 'granted');
        await loadRecentAssets();
      } catch {
        setPerm('unknown');
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [loadRecentAssets]);

  const openSettings = () => {
    void Linking.openSettings();
  };

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!r.canceled && r.assets[0]?.uri) onImageSelected(r.assets[0].uri);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const largeThumb = thumbs[0];
  const gridThumbs = thumbs.slice(1, 5);
  const gridSlots: (MediaLibrary.Asset | null)[] = [
    ...gridThumbs,
    ...Array.from({ length: Math.max(0, 4 - gridThumbs.length) }, () => null),
  ].slice(0, 4) as (MediaLibrary.Asset | null)[];

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer}>
          <Text style={styles.backDecor}>←</Text>
        </View>
        <Text style={styles.brand}>LUMERIS</Text>
        <Pressable onPress={() => Alert.alert('Export', 'Dışa aktarma düzenleme ekranındadır.')} hitSlop={8}>
          <Text style={styles.exportLink}>Export</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ImageBackground source={heroImage} style={styles.hero} imageStyle={styles.heroImg}>
          <View style={styles.heroScrim} />
          <Text style={styles.heroTitle}>Işığınızı Keşfedin</Text>
          <Text style={styles.heroSub}>
            Anılarınızı profesyonel araçlarla sanata dönüştürün. Kayıt yok, reklam yok — işlem cihazınızda kalır.
          </Text>
          <Pressable style={styles.heroCta} onPress={pickImage} accessibilityLabel="Düzenlemeye başla">
            <Text style={styles.heroCtaText}>DÜZENLEMEYE BAŞLA</Text>
          </Pressable>
        </ImageBackground>

        <View style={styles.permCard}>
          <Text style={styles.permIcon}>🛡</Text>
          <View style={styles.permMid}>
            <Text style={styles.permTitle}>Kütüphane Erişimi</Text>
            <Text style={styles.permSub}>Son fotoğrafları şeritte göstermek için</Text>
          </View>
          {perm === 'unknown' || perm === 'denied' ? (
            <Pressable onPress={() => void requestGalleryAccess()}>
              <Text style={styles.permAction}>İzin Ver</Text>
            </Pressable>
          ) : (
            <Text style={styles.permOk}>Açık</Text>
          )}
        </View>

        {perm === 'denied' && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Galeri kapalı. Ayarlardan açabilir veya yeniden deneyebilirsiniz.</Text>
            <View style={styles.bannerRow}>
              <Pressable style={styles.bannerBtn} onPress={openSettings}>
                <Text style={styles.bannerBtnText}>Ayarlar</Text>
              </Pressable>
              <Pressable style={styles.bannerBtnGhost} onPress={() => void requestGalleryAccess()}>
                <Text style={styles.bannerBtnGhostText}>Yeniden dene</Text>
              </Pressable>
            </View>
          </View>
        )}

        {perm === 'limited' && (
          <Text style={styles.limited}>Sınırlı galeri: yalnızca seçtiğiniz fotoğraflar listelenir.</Text>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={dark.accent} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.masonry}>
            {largeThumb ? (
              <Pressable onPress={() => onImageSelected(largeThumb.uri)} style={styles.heroThumbWrap}>
                <Image source={{ uri: largeThumb.uri }} style={styles.heroThumb} />
              </Pressable>
            ) : (
              <View style={[styles.heroThumbWrap, styles.placeholder]}>
                <Text style={styles.placeholderText}>Fotoğraf seçince burada görünür</Text>
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

        <Text style={styles.sectionLabel}>ÖNE ÇIKAN ARAÇLAR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsRow}>
          <View style={styles.toolCard}>
            <Text style={styles.toolIconBox}>±</Text>
            <Text style={styles.toolTitle}>Hassas Kontrol</Text>
            <Text style={styles.toolBody}>Pozlama, kontrast ve doygunluk için analog seviyesinde hassasiyet.</Text>
          </View>
          <View style={styles.toolCard}>
            <Text style={styles.toolIconBox}>◎</Text>
            <Text style={styles.toolTitle}>Sinematik</Text>
            <Text style={styles.toolBody}>Ön ayarlar ve film greni ile tek dokunuşta atmosfer.</Text>
          </View>
        </ScrollView>

        <Text style={styles.version}>v{appVersion}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dark.border,
  },
  brand: { color: dark.text, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  exportLink: { color: dark.textMuted, fontSize: 13, fontWeight: '600' },
  topBarSpacer: { width: 52, justifyContent: 'center' },
  backDecor: { color: dark.textMuted, fontSize: 20, fontWeight: '600' },
  scroll: { paddingBottom: 36 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 240,
    justifyContent: 'flex-end',
    padding: 22,
  },
  heroImg: { borderRadius: 22 },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  heroTitle: {
    color: dark.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSub: { color: dark.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  heroCta: {
    backgroundColor: dark.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  heroCtaText: { color: dark.bg, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
  },
  permIcon: { fontSize: 22, marginRight: 12 },
  permMid: { flex: 1 },
  permTitle: { color: dark.text, fontSize: 15, fontWeight: '700' },
  permSub: { color: dark.textMuted, fontSize: 12, marginTop: 2 },
  permAction: { color: dark.accent, fontSize: 14, fontWeight: '700' },
  permOk: { color: dark.textMuted, fontSize: 13, fontWeight: '600' },
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: dark.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
  },
  bannerText: { color: dark.text, fontSize: 13, marginBottom: 10 },
  bannerRow: { flexDirection: 'row', gap: 10 },
  bannerBtn: {
    flex: 1,
    backgroundColor: dark.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  bannerBtnText: { color: dark.bg, fontWeight: '700' },
  bannerBtnGhost: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  bannerBtnGhostText: { color: dark.text, fontWeight: '600' },
  limited: { marginHorizontal: 16, marginTop: 10, fontSize: 12, color: dark.textMuted },
  sectionLabel: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: dark.textDim,
  },
  masonry: { paddingHorizontal: 16, gap: 10 },
  heroThumbWrap: {
    width: '100%',
    height: 160,
    borderRadius: 14,
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
  },
  gridImg: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  placeholderText: { color: dark.textMuted, textAlign: 'center', fontSize: 13 },
  placeholderSmall: { backgroundColor: dark.surfaceMuted, borderWidth: 1, borderColor: dark.border },
  toolsRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  toolCard: {
    width: 220,
    padding: 16,
    borderRadius: 16,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  toolIconBox: {
    fontSize: 18,
    color: dark.accent,
    marginBottom: 10,
    fontWeight: '700',
  },
  toolTitle: { color: dark.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  toolBody: { color: dark.textMuted, fontSize: 13, lineHeight: 18 },
  version: {
    textAlign: 'center',
    color: dark.textDim,
    fontSize: 10,
    marginTop: 16,
    marginBottom: 24,
    letterSpacing: 0.5,
  },
});
