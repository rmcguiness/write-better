import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipProps = {
  label: string;
  emoji?: string;
  selected?: boolean;
  /** When selected, tint the chip with this accent instead of the theme tint. */
  accent?: string;
  onPress?: () => void;
};

export function Chip({ label, emoji, selected, accent, onPress }: ChipProps) {
  const theme = useTheme();
  const activeColor = accent ?? theme.tint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? activeColor : theme.backgroundElement,
          borderColor: selected ? activeColor : theme.border,
        },
        pressed && { opacity: 0.7 },
      ]}>
      <ThemedText
        style={[styles.label, { color: selected ? '#fff' : theme.text }]}
        numberOfLines={1}>
        {emoji ? `${emoji}  ` : ''}
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
