import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getGenre } from '@/lib/genres';
import { listPieces } from '@/lib/storage';
import { timeAgo } from '@/lib/text';
import type { Piece } from '@/lib/types';

export default function LibraryScreen() {
  const theme = useTheme();
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listPieces().then((p) => active && setPieces(p));
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Library</ThemedText>
          {!!pieces?.length && (
            <ThemedText type="small" themeColor="textSecondary">
              {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
            </ThemedText>
          )}
        </View>

        {pieces && pieces.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyTitle}>No pieces yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Finished sessions are saved here so you can revisit, review, and revise them.
            </ThemedText>
            <Button title="Start writing" onPress={() => router.push('/(tabs)')} />
          </View>
        ) : (
          <FlatList
            data={pieces ?? []}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <PieceRow piece={item} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function PieceRow({ piece }: { piece: Piece }) {
  const theme = useTheme();
  const genre = getGenre(piece.prompt.genre);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/piece/[id]', params: { id: piece.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={styles.rowTop}>
        <View style={[styles.dot, { backgroundColor: genre.accent }]} />
        <ThemedText type="small" themeColor="textSecondary">
          {genre.emoji} {genre.label} · {timeAgo(piece.createdAt)}
        </ThemedText>
        {piece.feedback && (
          <View style={[styles.grade, { backgroundColor: theme.tint }]}>
            <ThemedText style={styles.gradeText}>{piece.feedback.grade}</ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={styles.rowTitle} numberOfLines={1}>
        {piece.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {piece.body || 'Empty draft'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {piece.wordCount} words
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: { fontSize: 30, fontWeight: '800' },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { fontSize: 17, fontWeight: '700' },
  grade: {
    marginLeft: 'auto',
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  gradeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  center: { textAlign: 'center' },
});
