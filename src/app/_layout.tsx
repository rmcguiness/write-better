import { useMotionPreference } from '@/components/ui/motion';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  // Register icon fonts during static rendering too, so hydration sees the same glyphs.
  useFonts(Ionicons.font);
  const scheme = useColorScheme();
  const reduced = useMotionPreference();

  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...base, colors: { ...base.colors, primary: colors.tint, background: colors.background, card: colors.background, text: colors.text, border: colors.border } };
  useEffect(() => {
    if (typeof document !== 'undefined') { document.title = 'Write Better — A little space to write'; document.documentElement.style.backgroundColor = colors.background; }
  }, [colors]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ animation: reduced ? 'none' : 'default', headerShown: false, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', animation: reduced ? 'none' : 'fade' }} />
        <Stack.Screen name="piece/[id]" options={{ headerShown: true, headerBackTitle: 'Back', title: '' }} />
        <Stack.Screen name="learn/[id]" options={{ headerShown: true, headerBackTitle: 'Learn', title: '' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: true, title: 'Settings' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
