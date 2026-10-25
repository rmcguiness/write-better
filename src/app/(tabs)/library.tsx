import { Type, Radius, MaxContentWidth, Spacing } from '@/constants/theme';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { MotionView } from '@/components/ui/motion';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { getGenre } from '@/lib/genres';
import { listPieces } from '@/lib/storage';
import { timeAgo } from '@/lib/text';
import type { Piece } from '@/lib/types';

export default function LibraryScreen() {
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
          <View style={styles.empty}><EmptyState title="No pieces yet" message="A little practice becomes a body of work. Your finished sessions will find a home here." action="Start writing" onAction={() => router.push('/(tabs)')} /></View>
        ) : (
          <FlatList
            data={pieces ?? []}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={pieces === null ? <Skeleton /> : null}
            renderItem={({ item }) => <MotionView><PieceRow piece={item} /></MotionView>}
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
      accessibilityRole="button" accessibilityLabel={piece.title}
      onPress={() => router.push({ pathname: '/piece/[id]', params: { id: piece.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={styles.rowTop}>
        <View style={[styles.dot, { backgroundColor: theme.tint }]} />
        <ThemedText type="small" themeColor="textSecondary">
          {genre.emoji} {genre.label} · {timeAgo(piece.createdAt)}
        </ThemedText>
        {piece.feedback && (
          <View style={[styles.grade, { backgroundColor: theme.tint }]}>
            <ThemedText style={[styles.gradeText, { color: theme.tintText }]}>{piece.feedback.grade}</ThemedText>
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
  title: { fontSize: Type.title.fontSize, fontWeight: '600' },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { fontSize: Type.body.fontSize, fontWeight: '700' },
  grade: {
    marginLeft: 'auto',
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
    alignItems: 'center',
  },
  gradeText: { color: '#fff', fontSize: Type.caption.fontSize, fontWeight: '600' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  emptyTitle: { fontSize: Type.heading.fontSize, fontWeight: '700' },
  center: { textAlign: 'center' },
});
