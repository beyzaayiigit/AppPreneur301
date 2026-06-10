import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { dark } from '../theme/colors';
import { fonts } from '../theme/typography';

type Props = {
  visible: boolean;
  defaultName: string;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function SaveRecipeModal({ visible, defaultName, saving, onClose, onSave }: Props) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (visible) setName(defaultName);
  }, [defaultName, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable onPress={onClose} accessibilityLabel="Kapat" disabled={saving}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
            <Text style={styles.brand}>Favorilere kaydet</Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.hint}>
            Preset ve tüm ayarlar cihazında saklanır. Başka bir fotoğrafta aynı favoriyi tekrar
            uygulayabilirsin.
          </Text>

          <Text style={styles.label}>İSİM</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={48}
            placeholder="Örn: Mat film portre"
            placeholderTextColor={dark.textMuted}
            editable={!saving}
            autoCorrect={false}
            keyboardAppearance="dark"
            cursorColor={dark.primary}
            selectionColor={dark.accentOrganic}
          />

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            disabled={saving}
            onPress={() => onSave(name.trim() || defaultName)}
          >
            {saving ? (
              <ActivityIndicator color={dark.onPrimary} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Kaydet</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: dark.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: dark.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  close: { color: dark.textMuted, fontSize: 18, padding: 8 },
  brand: { color: dark.text, fontSize: 16, fontFamily: fonts.semiBold },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 1.4,
    color: dark.textMuted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: dark.outline,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: dark.text,
    backgroundColor: dark.surfaceBright,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: dark.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.75 },
  saveBtnText: { color: dark.onPrimary, fontSize: 16, fontFamily: fonts.bold },
});
