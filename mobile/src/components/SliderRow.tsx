import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { dark, theme } from '../theme/colors';

type Appearance = 'light' | 'dark';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: (v: number) => void;
  format?: (v: number) => string;
  accessibilityLabel?: string;
  /** Varsayılan: açık tema (theme); editör kabuğu için `dark` */
  appearance?: Appearance;
};

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onSlidingStart,
  onSlidingComplete,
  format = (v) => String(Math.round(v * 100) / 100),
  accessibilityLabel,
  appearance = 'light',
}: Props) {
  const isDark = appearance === 'dark';
  const trackMin = isDark ? dark.accent : theme.lilacDeep;
  const trackMax = isDark ? dark.border : theme.border;
  const thumb = isDark ? dark.accent : theme.lilacDeep;

  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ text: format(value) }}
    >
      <View style={styles.labelRow}>
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
        <Text style={[styles.value, isDark && styles.valueDark]}>{format(value)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onSlidingStart={onSlidingStart}
        onValueChange={onChange}
        onSlidingComplete={(v) => onSlidingComplete?.(v)}
        minimumTrackTintColor={trackMin}
        maximumTrackTintColor={trackMax}
        thumbTintColor={thumb}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  label: { color: theme.text, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  labelDark: { color: dark.text },
  slider: { width: '100%', height: 36 },
  value: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  valueDark: { color: dark.textMuted },
});
