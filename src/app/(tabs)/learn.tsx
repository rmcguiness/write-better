import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LESSONS, type Lesson } from '@/lib/learn';

export default function LearnScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <ThemedText style={styles.title}>Learn</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Short, practical craft notes. The real classroom, though, is the Write tab.
            </ThemedText>
          </View>

          <View style={[styles.tipCard, { backgroundColor: theme.tint }]}>
            <Ionicons name="bulb" size={20} color={theme.tintText} />
            <ThemedText style={[styles.tipText, { color: theme.tintText }]}>
              You learn writing by writing. Read a note, then go put it to work on a fresh prompt.
            </ThemedText>
          </View>

          {LESSONS.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/learn/[id]', params: { id: lesson.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}>
      <ThemedText style={styles.emoji}>{lesson.emoji}</ThemedText>
      <View style={styles.flex}>
        <View style={styles.rowHead}>
          <ThemedText style={styles.rowTitle}>{lesson.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {lesson.minutes} min
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {lesson.summary}
        </ThemedText>
        <ThemedText type="small" style={[styles.cat, { color: theme.tint }]}>
          {lesson.category}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: { fontSize: 30, fontWeight: '800' },
  tipCard: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
  },
  tipText: { flex: 1, fontWeight: '600', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  emoji: { fontSize: 28 },
  flex: { flex: 1, gap: 2 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.two },
  rowTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  cat: { fontWeight: '700', marginTop: 2 },
});
