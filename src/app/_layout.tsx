import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  // Register icon fonts during static rendering too, so hydration sees the same glyphs.
  useFonts(Ionicons.font);
  const scheme = useColorScheme();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="piece/[id]" options={{ headerShown: true, headerBackTitle: 'Back', title: '' }} />
        <Stack.Screen name="learn/[id]" options={{ headerShown: true, headerBackTitle: 'Learn', title: '' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: true, title: 'Settings' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
