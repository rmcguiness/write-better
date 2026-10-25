import { Type, Radius, Spacing } from '@/constants/theme';
import { MotionPressable } from './motion';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
    <MotionPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
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
        style={[styles.label, { color: selected ? theme.tintText : theme.text }]}
        numberOfLines={1}>
        {emoji ? `${emoji}  ` : ''}
        {label}
      </ThemedText>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44, justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: Type.caption.fontSize,
    fontWeight: '600',
  },
});
