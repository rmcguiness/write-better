import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface DropdownOption<T> {
  label: string;
  value: T;
  emoji?: string;
}

export interface DropdownProps<T extends string | number> {
  /** Small caption shown above the selected value. */
  caption?: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /** Accent for the selected row + caption. */
  accent?: string;
}

export function Dropdown<T extends string | number>({
  caption,
  value,
  options,
  onChange,
  accent,
}: DropdownProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];
  const active = accent ?? theme.tint;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          pressed && { opacity: 0.7 },
        ]}>
        {!!caption && (
          <ThemedText type="small" style={[styles.caption, { color: active }]} numberOfLines={1}>
            {caption}
          </ThemedText>
        )}
        <View style={styles.triggerValue}>
          <ThemedText style={styles.value} numberOfLines={1}>
            {selected?.emoji ? `${selected.emoji} ` : ''}
            {selected?.label}
          </ThemedText>
          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            {!!caption && (
              <ThemedText type="smallBold" style={styles.sheetTitle}>
                {caption}
              </ThemedText>
            )}
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {options.map((o) => {
                const isSel = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      { borderColor: theme.border },
                      isSel && { backgroundColor: active },
                      pressed && !isSel && { backgroundColor: theme.backgroundElement },
                    ]}>
                    <ThemedText
                      style={[styles.rowText, { color: isSel ? '#fff' : theme.text }]}
                      numberOfLines={1}>
                      {o.emoji ? `${o.emoji}  ` : ''}
                      {o.label}
                    </ThemedText>
                    {isSel && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  caption: { fontWeight: '700', fontSize: 12 },
  triggerValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  value: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  sheetTitle: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.two },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  rowText: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
});
