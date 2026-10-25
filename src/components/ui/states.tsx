import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';
import { MotionView } from './motion';

export function EmptyState({ title, message, action, onAction }: { title: string; message: string; action: string; onAction: () => void }) {
  const theme = useTheme();
  return <MotionView style={{ alignItems: 'center', padding: Spacing.five, gap: Spacing.three }}>
    <Ionicons name="book-outline" size={48} color={theme.tint} />
    <ThemedText type="heading">{title}</ThemedText>
    <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', maxWidth: 320 }}>{message}</ThemedText>
    <Button title={action} onPress={onAction} />
  </MotionView>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View accessibilityRole="alert" style={{ gap: Spacing.two }}><ThemedText themeColor="danger">{message}</ThemedText><Button title="Try again" variant="secondary" onPress={onRetry} /></View>;
}
export function Skeleton() {
  const theme = useTheme();
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ gap: Spacing.two, paddingVertical: Spacing.three }}>{[100, 85, 65].map(width => <View key={width} style={{ width: `${width}%`, height: 16, borderRadius: Radius.small, backgroundColor: theme.backgroundSelected }} />)}</View>;
}
