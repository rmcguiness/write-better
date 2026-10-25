import { Type, Radius, Spacing } from '@/constants/theme';
import { MotionPressable } from './motion';
import { ActivityIndicator, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export type ButtonProps = PressableProps & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();

  const bg =
    variant === 'primary'
      ? theme.tint
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.backgroundElement
          : 'transparent';

  const fg =
    variant === 'primary' || variant === 'danger'
      ? theme.tintText
      : variant === 'ghost'
        ? theme.tint
        : theme.text;

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      accessibilityState={{ disabled: !!disabled || loading, busy: loading }}
      style={(state) => [
        styles.base,
        size === 'lg' && styles.lg,
        { backgroundColor: bg },
        (state.pressed || disabled || loading) && { opacity: 0.65 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <ThemedText style={[styles.label, { color: fg }, size === 'lg' && styles.labelLg]}>
            {title}
          </ThemedText>
        </>
      )}
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  lg: {
    paddingVertical: Spacing.three + 2,
  },
  label: {
    fontSize: Type.body.fontSize,
    fontWeight: '600',
  },
  labelLg: {
    fontSize: Type.body.fontSize,
  },
});
