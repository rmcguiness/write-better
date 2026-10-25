import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, Type, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'display' | 'heading' | 'body' | 'caption' | 'serif';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (type === 'linkPrimary' ? 'tint' : 'text')] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'display' && Type.display,
        type === 'heading' && Type.heading,
        type === 'body' && Type.body,
        type === 'caption' && Type.caption,
        type === 'serif' && { ...Type.writing, fontFamily: Fonts.serif },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: Type.caption.fontSize,
    lineHeight: 20,
    fontWeight: 400,
  },
  smallBold: {
    fontSize: Type.caption.fontSize,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: Type.body.fontSize,
    lineHeight: 24,
    fontWeight: 400,
  },
  title: {
    fontSize: Type.title.fontSize,
    fontWeight: 600,
    lineHeight: Type.title.lineHeight,
  },
  subtitle: {
    fontSize: Type.title.fontSize,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: Type.caption.fontSize,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: Type.caption.fontSize,

  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: Type.caption.fontSize,
  },
});
