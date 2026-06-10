import { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { dark } from '../theme/colors';
import { fonts } from '../theme/typography';

type Props = {
  visible: boolean;
  topInset: number;
  favoriteCount: number;
  onClose: () => void;
  onSaveFavorite: () => void;
  onOpenFavorites: () => void;
  onExit: () => void;
};

type RowProps = {
  icon: string;
  label: string;
  sub?: string;
  badge?: string;
  disabled?: boolean;
  accent?: boolean;
  muted?: boolean;
  onPress: () => void;
};

function MenuRow({ icon, label, sub, badge, disabled, accent, muted, onPress }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        accent && styles.rowAccent,
        muted && styles.rowMuted,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.rowPressed,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={[styles.rowIconWrap, accent && styles.rowIconWrapAccent]}>
        <Text style={[styles.rowIcon, accent && styles.rowIconAccent]}>{icon}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function EditorSideMenu({
  visible,
  topInset,
  favoriteCount,
  onClose,
  onSaveFavorite,
  onOpenFavorites,
  onExit,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const panelW = Math.min(Math.round(winW * 0.82), 320);
  const offscreen = -panelW - 8;

  const translateX = useSharedValue(offscreen);
  const backdropOpacity = useSharedValue(0);

  const finishClose = () => onClose();

  const animateClose = (after?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateX.value = withTiming(offscreen, { duration: 260, easing: Easing.in(Easing.cubic) }, () => {
      if (after) runOnJS(after)();
      runOnJS(finishClose)();
    });
  };

  const runAction = (action: () => void) => {
    animateClose(action);
  };

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 220 });
      translateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      translateX.value = offscreen;
      backdropOpacity.value = 0;
    }
  }, [backdropOpacity, offscreen, translateX, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => animateClose()}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => animateClose()} accessibilityLabel="Menüyü kapat" />
        </Animated.View>

        <Animated.View style={[styles.panel, { width: panelW, paddingTop: topInset + 10 }, panelStyle]}>
          <View style={styles.panelHeader}>
            <View style={styles.panelBrandBlock}>
              <Text style={styles.panelBrand}>Lumeris</Text>
              <Text style={styles.panelSubtitle}>Düzenleyici paneli</Text>
            </View>
            <Pressable onPress={() => animateClose()} style={styles.closeBtn} accessibilityLabel="Kapat">
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FAVORİLER</Text>
            <MenuRow
              icon="★"
              label="Favorilere kaydet"
              sub="Preset ve tüm ayarlar cihazında kalır"
              accent
              onPress={() => runAction(onSaveFavorite)}
            />
            <MenuRow
              icon="◫"
              label="Favoriler"
              sub="Kayıtlı görünümleri bu fotoğrafa uygula"
              badge={favoriteCount > 0 ? String(favoriteCount) : undefined}
              onPress={() => runAction(onOpenFavorites)}
            />
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ÇIKIŞ</Text>
            <MenuRow
              icon="←"
              label="Ana ekrana dön"
              sub="Düzenlemeyi kaybetmeden çık"
              muted
              onPress={() => runAction(onExit)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Favoriler yalnızca bu cihazda saklanır.</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: dark.overlay,
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    maxWidth: 320,
    flexDirection: 'column',
    backgroundColor: dark.bgElevated,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: dark.borderSubtle,
    paddingHorizontal: 18,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 8, height: 0 },
    elevation: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dark.divider,
  },
  panelBrandBlock: { flex: 1, paddingRight: 12 },
  panelBrand: {
    color: dark.text,
    fontSize: 20,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  panelSubtitle: {
    color: dark.textMuted,
    fontSize: 12,
    fontFamily: fonts.regular,
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  closeBtnText: {
    color: dark.textMuted,
    fontSize: 16,
  },
  section: {
    gap: 8,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
    color: dark.textMuted,
    marginBottom: 4,
    marginLeft: 2,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: dark.divider,
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  rowAccent: {
    backgroundColor: 'rgba(62, 75, 67, 0.42)',
    borderColor: 'rgba(132, 165, 157, 0.28)',
  },
  rowMuted: {
    backgroundColor: dark.surfaceMuted,
  },
  rowDisabled: {
    opacity: 0.42,
  },
  rowPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
  },
  rowIconWrapAccent: {
    backgroundColor: 'rgba(132, 165, 157, 0.18)',
    borderColor: 'rgba(132, 165, 157, 0.35)',
  },
  rowIcon: {
    fontSize: 16,
    color: dark.textMuted,
  },
  rowIconAccent: {
    color: dark.primary,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: dark.text,
    marginBottom: 2,
  },
  rowLabelDisabled: {
    color: dark.textDim,
  },
  rowSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: dark.textMuted,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.primaryContainer,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: dark.onPrimaryContainer,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 18,
    paddingHorizontal: 4,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: dark.textDim,
  },
});
