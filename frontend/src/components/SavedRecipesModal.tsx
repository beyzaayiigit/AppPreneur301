import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { EditState } from '../engine/editState';
import { PRESET_NAMES } from '../engine/presets';
import { buildEditStateDetail } from '../lib/formatEditStateDetail';
import { deleteSavedRecipe, listSavedRecipes, type SavedRecipe } from '../lib/savedRecipesStorage';
import { dark } from '../theme/colors';
import { fonts } from '../theme/typography';

type Props = {
  visible: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onApply?: (state: EditState, recipe: SavedRecipe) => void;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FavoriteDetailGrid({ state }: { state: EditState }) {
  const lines = buildEditStateDetail(state);
  return (
    <View style={styles.detailGrid}>
      {lines.map((line) => (
        <View key={line.label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{line.label}</Text>
          <Text style={styles.detailValue}>{line.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function SavedRecipesModal({ visible, readOnly = false, onClose, onApply }: Props) {
  const [items, setItems] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listSavedRecipes());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void refresh();
  }, [refresh, visible]);

  useEffect(() => {
    if (!visible) setExpandedId(null);
  }, [visible]);

  const confirmDelete = (recipe: SavedRecipe) => {
    Alert.alert('Favoriyi sil', `"${recipe.name}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteSavedRecipe(recipe.id);
            if (expandedId === recipe.id) setExpandedId(null);
            await refresh();
          })();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable onPress={onClose} accessibilityLabel="Kapat">
              <Text style={styles.close}>✕</Text>
            </Pressable>
            <Text style={styles.brand}>Favoriler</Text>
            <View style={{ width: 28 }} />
          </View>

          {readOnly ? (
            <Text style={styles.hint}>
              Bir fotoğraf açın; editör menüsünden favoriyi mevcut görsele uygulayın.
            </Text>
          ) : (
            <Text style={styles.hint}>
              Kartı açarak tüm ayar değerlerini görün. Uygula ile bu fotoğrafa aktarın.
            </Text>
          )}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={dark.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Henüz favori yok</Text>
              <Text style={styles.emptySub}>
                Editör menüsünden Favorilere kaydet ile görünümü saklayın; sonra buradan uygulayın.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {items.map((recipe) => {
                const preset = PRESET_NAMES[recipe.state.presetIndex] ?? 'Original';
                const expanded = expandedId === recipe.id;
                return (
                  <View key={recipe.id} style={styles.itemCard}>
                    <Pressable
                      style={styles.itemHeader}
                      onPress={() => setExpandedId(expanded ? null : recipe.id)}
                      accessibilityLabel={`${recipe.name}, detay ${expanded ? 'gizle' : 'göster'}`}
                    >
                      <View style={styles.itemHeaderMain}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {recipe.name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {preset} · {formatDate(recipe.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.expandChevron}>{expanded ? '▾' : '▸'}</Text>
                    </Pressable>

                    {expanded ? <FavoriteDetailGrid state={recipe.state} /> : null}

                    {!readOnly ? (
                      <View style={styles.itemFooter}>
                        <Pressable
                          style={styles.applyBtn}
                          onPress={() => {
                            onApply?.(recipe.state, recipe);
                            onClose();
                          }}
                        >
                          <Text style={styles.applyBtnText}>Uygula</Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => confirmDelete(recipe)}
                          accessibilityLabel={`${recipe.name} sil`}
                        >
                          <Text style={styles.deleteBtnText}>Sil</Text>
                        </Pressable>
                      </View>
                    ) : expanded ? (
                      <Text style={styles.readOnlyNote}>Uygulamak için editörde bir fotoğraf açın.</Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
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
    paddingBottom: 28,
    paddingTop: 12,
    maxHeight: '86%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: dark.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  close: { color: dark.textMuted, fontSize: 18, padding: 8 },
  brand: { color: dark.text, fontSize: 16, fontFamily: fonts.semiBold },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
    marginBottom: 14,
  },
  loadingBox: { paddingVertical: 32, alignItems: 'center' },
  emptyBox: { paddingVertical: 28, paddingHorizontal: 8, alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: dark.text },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
    textAlign: 'center',
  },
  list: { flexGrow: 0 },
  itemCard: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.borderSubtle,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemHeaderMain: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: fonts.semiBold, fontSize: 14, color: dark.text, marginBottom: 3 },
  rowMeta: { fontFamily: fonts.regular, fontSize: 11, color: dark.textMuted },
  expandChevron: {
    fontSize: 14,
    color: dark.textMuted,
    paddingHorizontal: 4,
  },
  detailGrid: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dark.divider,
    paddingTop: 10,
    marginTop: -2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: dark.textMuted,
    letterSpacing: 0.2,
  },
  detailValue: {
    minWidth: 52,
    textAlign: 'right',
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: dark.onPrimaryContainer,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: dark.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: { fontFamily: fonts.semiBold, fontSize: 12, color: dark.onPrimaryContainer },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark.outline,
  },
  deleteBtnText: { color: dark.textMuted, fontSize: 12, fontFamily: fonts.medium },
  readOnlyNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: dark.textDim,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
  },
});
