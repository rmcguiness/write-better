import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#292D2A', background: '#F8F6F1', backgroundElement: '#FFFDF9',
    backgroundSelected: '#EAE8E0', textSecondary: '#72766F', tint: '#326D60',
    tintText: '#FFFFFF', border: '#DFE1D7', success: '#36734D', warning: '#996C26', danger: '#B34840',
  },
  dark: {
    text: '#E8E8DF', background: '#181C1A', backgroundElement: '#222824',
    backgroundSelected: '#303932', textSecondary: '#A5AFA5', tint: '#A0CABB',
    tintText: '#182A23', border: '#39433C', success: '#A3CBA6', warning: '#D9B775', danger: '#E9A09A',
  },
} as const;

export const Radius = { small: 8, medium: 12, large: 20, pill: 999 } as const;
export const Type = {
  display: { fontSize: 36, lineHeight: 44 },
  title: { fontSize: 30, lineHeight: 38 },
  heading: { fontSize: 21, lineHeight: 29 },
  body: { fontSize: 16, lineHeight: 25 },
  caption: { fontSize: 13, lineHeight: 20 },
  writing: { fontSize: 21, lineHeight: 33 },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'New York',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
