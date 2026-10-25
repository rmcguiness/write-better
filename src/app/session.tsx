import { Radius, Fonts, Type, Spacing } from '@/constants/theme';
import { ProgressFill } from '@/components/ui/motion';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { getGenre } from '@/lib/genres';
import { newId } from '@/lib/id';
import { savePiece } from '@/lib/storage';
import { countWords, formatClock } from '@/lib/text';
import type { GenreId, Piece, Prompt } from '@/lib/types';

function deriveTitle(body: string, fallback: string): string {
  const firstLine = body.trim().split('\n')[0].trim();
  if (!firstLine) return fallback;
  const words = firstLine.split(/\s+/).slice(0, 8).join(' ');
  return words.length > 60 ? words.slice(0, 57) + '…' : words;
}

export default function SessionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    promptId: string;
    promptText: string;
    genre: GenreId;
    tip: string;
    wordTarget: string;
    durationSec: string;
  }>();

  const prompt: Prompt = useMemo(
    () => ({
      id: params.promptId ?? newId('prompt'),
      text: params.promptText ?? '',
      genre: (params.genre ?? 'literary') as GenreId,
      tip: params.tip || undefined,
    }),
    [params.promptId, params.promptText, params.genre, params.tip],
  );
  const wordTarget = Number(params.wordTarget ?? 0);
  const durationSec = Number(params.durationSec ?? 0);
  const genre = getGenre(prompt.genre);

  const [body, setBody] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [startedAt] = useState(() => Date.now());
  const startedRef = useRef(startedAt);

  const wordCount = countWords(body);
  const remaining = durationSec > 0 ? Math.max(0, durationSec - elapsed) : 0;
  const lowTime = durationSec > 0 && remaining <= 30 && remaining > 0;

  // One-second ticker for the timer / elapsed clock.
  useEffect(() => {
    if (timeUp) return;
    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - startedRef.current) / 1000);
      setElapsed(secs);
      if (durationSec > 0 && secs >= durationSec) {
        setElapsed(durationSec);
        setTimeUp(true);
      }
    }, 250);
    return () => clearInterval(t);
  }, [durationSec, timeUp]);

  function buildPiece(): Piece {
    const now = Date.now();
    return {
      id: newId('piece'),
      prompt,
      title: deriveTitle(body, `${genre.label} · ${new Date(now).toLocaleDateString()}`),
      body: body.trim(),
      wordTarget,
      wordCount,
      durationSec,
      elapsedSec: elapsed,
      createdAt: now,
      updatedAt: now,
    };
  }

  async function finish() {
    if (!body.trim()) {
      // Nothing written — just leave.
      router.back();
      return;
    }
    const piece = buildPiece();
    await savePiece(piece);
    router.replace({ pathname: '/piece/[id]', params: { id: piece.id } });
  }

  function attemptExit() {
    if (body.trim()) setShowExit(true);
    else router.back();
  }

  const progress = wordTarget > 0 ? Math.min(1, wordCount / wordTarget) : 0;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <Pressable onPress={attemptExit} hitSlop={10} accessibilityRole="button" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }} accessibilityLabel="Exit">
            <Ionicons name="close" size={26} color={theme.textSecondary} />
          </Pressable>

          <View style={styles.clockWrap}>
            <Ionicons
              name={durationSec > 0 ? 'timer-outline' : 'time-outline'}
              size={16}
              color={lowTime ? theme.danger : theme.textSecondary}
            />
            <ThemedText
              style={[styles.clock, { color: lowTime ? theme.danger : theme.text }]}>
              {durationSec > 0 ? formatClock(remaining) : formatClock(elapsed)}
            </ThemedText>
          </View>

          <Button title="Done" variant="ghost" onPress={finish} />
        </View>

        {/* Word progress */}
        <View style={styles.meta}>
          <ThemedText type="small" themeColor="textSecondary">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
            {wordTarget > 0 ? ` / ${wordTarget}` : ''}
          </ThemedText>
          {wordTarget > 0 && (
            <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
              <ProgressFill progress={progress} color={progress >= 1 ? theme.success : theme.tint} />
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.editorWrap}>
            {/* Collapsible prompt reminder */}
            <Pressable accessibilityRole="button" accessibilityLabel="Toggle prompt" accessibilityState={{ expanded: promptOpen }} onPress={() => setPromptOpen((o) => !o)} style={styles.promptBar}>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={promptOpen ? undefined : 1}
                style={styles.promptReminder}>
                {prompt.text}
              </ThemedText>
              <Ionicons
                name={promptOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>

            <TextInput
              style={[styles.input, { color: theme.text }]}
              accessibilityLabel="Writing editor" placeholder="Start writing…"
              placeholderTextColor={theme.textSecondary}
              multiline
              autoFocus
              value={body}
              onChangeText={setBody}
              textAlignVertical="top"
              editable={!timeUp}
              scrollEnabled
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Time's up overlay */}
      {timeUp && (
        <Overlay>
          <ThemedText style={styles.overlayTitle}>⏱ Time’s up</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            You wrote {wordCount} {wordCount === 1 ? 'word' : 'words'} in {formatClock(elapsed)}.
          </ThemedText>
          <Button title="Save & review" onPress={finish} style={styles.overlayBtn} />
          <Button
            title="Keep writing"
            variant="ghost"
            onPress={() => {
              // Switch to untimed; resume the clock from where it stopped.
              startedRef.current = Date.now() - elapsed * 1000;
              setTimeUp(false);
            }}
            style={styles.overlayBtn}
          />
        </Overlay>
      )}

      {/* Exit confirmation */}
      {showExit && (
        <Overlay>
          <ThemedText style={styles.overlayTitle}>Leave without saving?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Your draft hasn’t been saved yet.
          </ThemedText>
          <Button
            title="Save & exit"
            onPress={() => {
              setShowExit(false);
              finish();
            }}
            style={styles.overlayBtn}
          />
          <Button
            title="Discard"
            variant="danger"
            onPress={() => router.back()}
            style={styles.overlayBtn}
          />
          <Button
            title="Keep writing"
            variant="ghost"
            onPress={() => setShowExit(false)}
            style={styles.overlayBtn}
          />
        </Overlay>
      )}
    </ThemedView>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.overlay}>
      <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  clockWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  clock: { fontSize: Type.body.fontSize, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meta: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.one,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2 },
  editorWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  promptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  promptReminder: { flex: 1, fontStyle: 'italic' },
  input: {
    flex: 1,
    ...Type.writing,
    fontFamily: Fonts.serif,
    paddingBottom: Spacing.six,
    // Keep the browser focus ring off the text on web.
    ...(Platform.OS === 'web' ? { paddingHorizontal: Spacing.two, paddingTop: Spacing.two, borderRadius: 8 } : null),
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  overlayTitle: { fontSize: Type.heading.fontSize, fontWeight: '600', textAlign: 'center' },
  center: { textAlign: 'center' },
  overlayBtn: { alignSelf: 'stretch' },
});
