import { ScrollViewStyleReset } from 'expo-router/html';
import { Colors } from '@/constants/theme';

export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Write Better — A little space to write</title>
    <meta name="description" content="A calm space for a daily writing practice. Discover a prompt, find your words, and grow your craft." />
    <meta name="theme-color" content={Colors.light.background} media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content={Colors.dark.background} media="(prefers-color-scheme: dark)" />
    <ScrollViewStyleReset />
  </head><body>{children}</body></html>;
}
