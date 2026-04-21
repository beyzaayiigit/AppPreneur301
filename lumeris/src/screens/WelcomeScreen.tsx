import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme/colors';

type Props = {
  onImageSelected: (uri: string) => void;
};

type Perm = 'unknown' | 'granted' | 'denied' | 'limited';

export function WelcomeScreen({ onImageSelected }: Props) {
  const [perm, setPerm] = useState<Perm>('unknown');
  const [thumbs, setThumbs] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await MediaLibrary.requestPermissionsAsync();
      if (!r.granted) {
        setPerm('denied');
        setThumbs([]);
        return;
      }
      setPerm(r.accessPrivileges === 'limited' ? 'limited' : 'granted');
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Lumeris</Text>
      <Text style={styles.sub}>Kayıt yok, reklam yok — sadece saf analog.</Text>

      <View style={styles.runProof} accessibilityLabel="Uygulama çalışıyor, MVP derlemesi">
        <Text style={styles.runProofTitle}>Uygulama çalışıyor</Text>
        <Text style={styles.runProofDetail}>
          On-device MVP derlemesi · Expo · sürüm {appVersion}
        </Text>
        <Text style={styles.runProofHint}>
          Bu ekran açıldıysa proje cihazda doğru şekilde yüklenmiştir.
        </Text>
      </View>

      {perm === 'denied' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Galeri erişimi kapalı. Fotoğraf seçmek için izin verin veya Ayarlar’dan açın.
          </Text>
          <Pressable style={styles.bannerBtn} onPress={openSettings}>
            <Text style={styles.bannerBtnText}>Ayarlar</Text>
          </Pressable>
          <Pressable style={styles.bannerBtnSecondary} onPress={() => void refresh()}>
            <Text style={styles.bannerBtnText}>Yeniden dene</Text>
          </Pressable>
        </View>
      )}

      {perm === 'limited' && (
        <Text style={styles.limited}>
          Sınırlı galeri erişimi: yalnızca seçtiğiniz fotoğraflar görünür. Tüm kütüphane için Ayarlar’dan
          erişimi genişletebilirsiniz.
        </Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.lilacDeep} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          horizontal
          data={thumbs}
          keyExtractor={(item) => item.id}
          style={styles.strip}
          contentContainerStyle={styles.stripContent}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Image source={{ uri: item.uri }} style={styles.thumb} accessibilityLabel="Galeri önizlemesi" />
          )}
          ListEmptyComponent={
            perm !== 'denied' ? (
              <Text style={styles.empty}>Henüz önizleme yok — aşağıdan fotoğraf seçin.</Text>
            ) : null
          }
        />
      )}

      <View style={{ flex: 1 }} />

      <Pressable
        style={styles.cta}
        onPress={pickImage}
        accessibilityRole="button"
        accessibilityLabel="Düzenlemeye başla"
      >
        <Text style={styles.ctaText}>Düzenlemeye Başla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.lilac,
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 8,
    fontSize: 16,
    color: theme.textMuted,
  },
  runProof: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.lilacDeep,
  },
  runProofTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  runProofDetail: {
    marginTop: 4,
    fontSize: 13,
    color: theme.textMuted,
  },
  runProofHint: {
    marginTop: 8,
    fontSize: 12,
    color: theme.textMuted,
    fontStyle: 'italic',
  },
  banner: {
    marginTop: 20,
    padding: 14,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bannerText: { color: theme.text, fontSize: 14, marginBottom: 10 },
  bannerBtn: {
    backgroundColor: theme.lilacDeep,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerBtnSecondary: {
    backgroundColor: theme.softGray,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bannerBtnText: { color: theme.text, fontWeight: '600' },
  limited: {
    marginTop: 12,
    fontSize: 13,
    color: theme.textMuted,
  },
  strip: { marginTop: 28, maxHeight: 108 },
  stripContent: { gap: 10, paddingVertical: 4 },
  thumb: {
    width: 72,
    height: 96,
    borderRadius: 8,
    backgroundColor: theme.border,
  },
  empty: { color: theme.textMuted, paddingVertical: 20 },
  cta: {
    marginBottom: 40,
    backgroundColor: theme.text,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { color: theme.lilac, fontSize: 17, fontWeight: '700' },
});
