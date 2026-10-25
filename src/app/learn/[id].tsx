import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Type, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLesson } from '@/lib/learn';

export default function LessonScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = getLesson(id);

  useLayoutEffect(() => {
    navigation.setOptions({ title: lesson ? `${lesson.emoji}  ${lesson.title}` : '' });
  }, [navigation, lesson]);

  if (!lesson) {
    return (
      <ThemedView style={styles.fill}>
        <ThemedText style={styles.missing}>Lesson not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.title}>{lesson.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {lesson.category} · {lesson.minutes} min read
        </ThemedText>

        <View style={styles.bodyWrap}>
          {renderBody(lesson.body, theme.text, theme.textSecondary, theme.tint)}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

/** Render inline `**bold**` and `*italic*` markers as styled spans. */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) {
      out.push(
        <ThemedText key={`${keyBase}-b${i}`} style={styles.bold}>
          {m[1]}
        </ThemedText>,
      );
    } else {
      out.push(
        <ThemedText key={`${keyBase}-i${i}`} style={styles.italic}>
          {m[2]}
        </ThemedText>,
      );
    }
    last = regex.lastIndex;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Render the tiny markup format: "## " headings, "- " bullets, blank-line paragraphs. */
function renderBody(body: string, _text: string, _secondary: string, accent: string) {
  return body.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (trimmed === '') return <View key={i} style={{ height: Spacing.two }} />;
    if (trimmed.startsWith('## ')) {
      return (
        <ThemedText key={i} style={styles.heading}>
          {trimmed.slice(3)}
        </ThemedText>
      );
    }
    if (trimmed.startsWith('- ')) {
      return (
        <View key={i} style={styles.bullet}>
          <ThemedText style={[styles.dot, { color: accent }]}>•</ThemedText>
          <ThemedText style={styles.bulletText}>{inline(trimmed.slice(2), `b${i}`)}</ThemedText>
        </View>
      );
    }
    // Numbered list item like "1. ..."
    if (/^\d+\.\s/.test(trimmed)) {
      const [, num, rest] = trimmed.match(/^(\d+)\.\s(.*)$/) ?? [];
      return (
        <View key={i} style={styles.bullet}>
          <ThemedText style={[styles.dot, { color: accent }]}>{num}.</ThemedText>
          <ThemedText style={styles.bulletText}>{inline(rest, `n${i}`)}</ThemedText>
        </View>
      );
    }
    return (
      <ThemedText key={i} style={styles.paragraph}>
        {inline(trimmed, `p${i}`)}
      </ThemedText>
    );
  });
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  missing: { padding: Spacing.four },
  content: {
    padding: Spacing.four,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: { fontSize: Type.title.fontSize, fontWeight: '600', lineHeight: 36 },
  bodyWrap: { marginTop: Spacing.three },
  heading: { fontSize: Type.heading.fontSize, fontWeight: '600', marginTop: Spacing.three, marginBottom: Spacing.one },
  paragraph: { ...Type.writing, fontFamily: Fonts.serif, marginBottom: Spacing.two },
  bullet: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.one },
  dot: { fontSize: Type.body.fontSize, fontWeight: '600', minWidth: 18 },
  bulletText: { flex: 1, ...Type.writing, fontFamily: Fonts.serif },
  bold: { fontWeight: '600' },
  italic: { fontStyle: 'italic' },
});
