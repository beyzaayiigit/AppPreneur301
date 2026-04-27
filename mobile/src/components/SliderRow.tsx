import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/colors';

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
}: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ text: format(value) }}
    >
      <Text style={styles.label}>{label}</Text>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onSlidingStart={onSlidingStart}
        onValueChange={(v) => {
          onChange(v);
          void Haptics.selectionAsync();
        }}
        onSlidingComplete={(v) => onSlidingComplete?.(v)}
        minimumTrackTintColor={theme.lilacDeep}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.lilacDeep}
      />
      <Text style={styles.value}>{format(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  label: { color: theme.text, fontSize: 13, marginBottom: 4, fontWeight: '600' },
  slider: { width: '100%', height: 36 },
  value: { color: theme.textMuted, fontSize: 12 },
});
