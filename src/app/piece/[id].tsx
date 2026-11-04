import { Radius, Fonts, Type, MaxContentWidth, Spacing } from '@/constants/theme';
import { ProgressFill } from '@/components/ui/motion';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { gradePiece, isAIConfigured, peerReview, resolveAIConfig, type AIConfig } from '@/lib/ai';
import { ApiError, getAccount, type Account } from '@/lib/api';
import { getGenre } from '@/lib/genres';
import {
  appendReview,
  deletePiece,
  getPiece,
  getSettings,
  setFeedback,
  type AppSettings,
} from '@/lib/storage';
import { formatClock, timeAgo } from '@/lib/text';
import { limitAlert, usageSummary } from '@/lib/usage';
import type { Feedback, Piece, ReviewTurn } from '@/lib/types';

export default function PieceScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [piece, setPiece] = useState<Piece | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [aiError, setAiError] = useState<{ message: string; action: 'grade' | 'review' } | null>(null);
  const [grading, setGrading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [draft, setDraft] = useState('');

  const refreshAccount = useCallback((cfg: AIConfig | null) => {
    if (cfg?.mode !== 'managed') {
      setAccount(null);
      return;
    }
    getAccount(cfg.backendUrl, cfg.token).then(setAccount).catch(() => setAccount(null));
  }, []);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([getPiece(id), getSettings()]);
    setPiece(p ?? null);
    setSettings(s);
    refreshAccount(resolveAIConfig(s));
  }, [id, refreshAccount]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const genre = piece ? getGenre(piece.prompt.genre) : null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        piece ? (
          <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Delete">
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </Pressable>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, piece, theme]);

  function confirmDelete() {
    const doDelete = async () => {
      await deletePiece(id);
      router.back();
    };
    if (Platform.OS === 'web') {
      // RN Alert has no web implementation with buttons.
      if (confirm('Delete this piece permanently?')) doDelete();
    } else {
      Alert.alert('Delete piece?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function handleGrade() {
    setAiError(null);
    const cfg = settings && resolveAIConfig(settings);
    if (!piece || !cfg) return;
    setGrading(true);
    try {
      const feedback: Feedback = await gradePiece(piece, cfg);
      await setFeedback(piece.id, feedback);
      setPiece({ ...piece, feedback });
      refreshAccount(cfg);
    } catch (e) {
      setAiError({ message: e instanceof Error ? e.message : 'Could not load feedback.', action: 'grade' });
      notify(e);
    } finally {
      setGrading(false);
    }
  }

  async function handleSendReview() {
    const cfg = settings && resolveAIConfig(settings);
    if (!piece || !cfg) return;
    const text = draft.trim();
    // This timestamp is captured in the send event handler.
    // eslint-disable-next-line react-hooks/purity
    const writerTurn: ReviewTurn = { role: 'writer', text: text || '…', createdAt: Date.now() };
    const history = piece.review ?? [];
    const optimistic = text ? [...history, writerTurn] : history;

    setAiError(null);
    setDraft('');
    setReviewing(true);
    setPiece({ ...piece, review: optimistic });
    try {
      const reply = await peerReview(piece, optimistic, cfg);
      // This timestamp is captured after the review request resolves.
      // eslint-disable-next-line react-hooks/purity
      const reviewerTurn: ReviewTurn = { role: 'reviewer', text: reply, createdAt: Date.now() };
      const toPersist = text ? [writerTurn, reviewerTurn] : [reviewerTurn];
      await appendReview(piece.id, toPersist);
      setPiece({ ...piece, review: [...optimistic, reviewerTurn] });
      refreshAccount(cfg);
    } catch (e) {
      setPiece({ ...piece, review: history }); // roll back
      setAiError({ message: e instanceof Error ? e.message : 'Could not load feedback.', action: 'review' });
      notify(e);
    } finally {
      setReviewing(false);
    }
  }

  function notify(e: unknown) {
    const msg = e instanceof Error ? e.message : 'Something went wrong.';
    const limit = e instanceof ApiError ? limitAlert(e) : null;
    if (Platform.OS === 'web') {
      // A blocking window.alert() freezes the page; the in-page ErrorState shows the message.
      if (limit?.canUpgrade) router.push('/settings');
    } else if (limit) {
      Alert.alert(
        limit.title,
        limit.message,
        limit.canUpgrade
          ? [
              { text: 'Not now', style: 'cancel' },
              { text: 'Upgrade', onPress: () => router.push('/settings') },
            ]
          : [{ text: 'OK' }],
      );
    } else {
      Alert.alert('Heads up', msg);
    }
  }

  if (!piece || !genre) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  const aiReady = settings ? isAIConfigured(settings) : false;

  return (
    <ThemedView style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Prompt + meta */}
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: theme.tint }]}>
            <ThemedText style={[styles.badgeText, { color: theme.tintText }]}>
              {genre.emoji}  {genre.label}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {timeAgo(piece.createdAt)}
          </ThemedText>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.prompt}>
          {piece.prompt.text}
        </ThemedText>

        <ThemedText style={styles.title}>{piece.title}</ThemedText>

        <View style={styles.statsRow}>
          <Stat label="Words" value={String(piece.wordCount)} />
          {piece.wordTarget > 0 && <Stat label="Target" value={String(piece.wordTarget)} />}
          <Stat label="Time" value={formatClock(piece.elapsedSec)} />
        </View>

        {/* The writing */}
        <Card>
          <ThemedText style={styles.body}>{piece.body || 'Empty draft.'}</ThemedText>
        </Card>

        {settings?.aiMode === 'managed' && account && aiReady && <UsageLine account={account} />}

        {/* Grade */}
        <SectionHeader icon="ribbon-outline" title="AI grade" />
        {grading && <Skeleton />}
        {aiError?.action === 'grade' && <ErrorState message={aiError.message} onRetry={handleGrade} />}
        {piece.feedback ? (
          <FeedbackView feedback={piece.feedback} onRegrade={aiReady ? handleGrade : undefined} regrading={grading} />
        ) : aiReady ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Get a structured grade across craft, structure, originality, and prompt response — with
              quoted line notes.
            </ThemedText>
            <Button
              title={grading ? 'Grading…' : 'Grade my writing'}
              loading={grading}
              onPress={handleGrade}
              icon={<Ionicons name="sparkles" size={18} color={theme.tintText} />}
            />
          </Card>
        ) : (
          <ConnectAIPrompt />
        )}

        {/* Peer review */}
        <SectionHeader icon="chatbubbles-outline" title="Peer review" />
        {aiError?.action === 'review' && <ErrorState message={aiError.message} onRetry={handleSendReview} />}
        {aiReady ? (
          <Card>
            {(piece.review ?? []).length === 0 && !reviewing && (
              <ThemedText type="small" themeColor="textSecondary">
                Talk through your draft with an AI writing peer. Ask for first impressions, or push
                back on a note — it’s a conversation, not a verdict.
              </ThemedText>
            )}

            {(piece.review ?? []).map((turn, i) => (
              <ReviewBubble key={i} turn={turn} />
            ))}

            {reviewing && (
              <View style={[styles.bubble, styles.reviewer, { backgroundColor: theme.backgroundSelected }]}>
                <Skeleton />
              </View>
            )}

            <View style={[styles.inputRow, { borderColor: theme.border }]}>
              <TextInput
                accessibilityLabel="Peer review message" style={[styles.input, { color: theme.text }]}
                placeholder={
                  (piece.review ?? []).length === 0 ? 'Ask for first impressions…' : 'Reply…'
                }
                placeholderTextColor={theme.textSecondary}
                value={draft}
                onChangeText={setDraft}
                multiline
                editable={!reviewing}
                onSubmitEditing={handleSendReview}
              />
              <Pressable
                accessibilityRole="button" accessibilityLabel="Send review message" accessibilityState={{ disabled: reviewing }} onPress={handleSendReview}
                disabled={reviewing}
                hitSlop={8}
                style={[styles.send, { backgroundColor: theme.tint }, reviewing && { opacity: 0.5 }]}>
                <Ionicons name="arrow-up" size={20} color={theme.tintText} />
              </Pressable>
            </View>
          </Card>
        ) : (
          <ConnectAIPrompt />
        )}

        <View style={{ height: Spacing.six }} />
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={theme.text} />
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    </View>
  );
}

function FeedbackView({
  feedback,
  onRegrade,
  regrading,
}: {
  feedback: Feedback;
  onRegrade?: () => void;
  regrading?: boolean;
}) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.gradeTop}>
        <View style={[styles.gradeCircle, { backgroundColor: theme.tint }]}>
          <ThemedText style={[styles.gradeBig, { color: theme.tintText }]}>{feedback.grade}</ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText style={styles.overall}>{feedback.overall}/100</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {feedback.summary}
          </ThemedText>
        </View>
      </View>

      <View style={styles.scores}>
        {feedback.scores.map((s, i) => (
          <View key={i} style={styles.scoreLine}>
            <ThemedText type="small" style={styles.flex}>
              {s.label}
            </ThemedText>
            <View style={[styles.scoreTrack, { backgroundColor: theme.backgroundSelected }]}>
              <ProgressFill progress={s.score / s.max} color={theme.tint} />
            </View>
            <ThemedText type="smallBold" style={styles.scoreNum}>
              {s.score}/{s.max}
            </ThemedText>
          </View>
        ))}
      </View>

      <FeedbackList title="What’s working" items={feedback.strengths} color={theme.success} icon="checkmark-circle" />
      <FeedbackList title="Where to grow" items={feedback.improvements} color={theme.tint} icon="arrow-up-circle" />

      {feedback.lineNotes.length > 0 && (
        <View style={styles.lineNotes}>
          <ThemedText type="smallBold">Line notes</ThemedText>
          {feedback.lineNotes.map((ln, i) => (
            <View key={i} style={[styles.lineNote, { borderLeftColor: theme.tint }]}>
              <ThemedText type="small" style={styles.quote}>
                “{ln.quote}”
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {ln.note}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {onRegrade && (
        <Button title={regrading ? 'Re-grading…' : 'Re-grade'} variant="secondary" loading={regrading} onPress={onRegrade} />
      )}
    </Card>
  );
}

function FeedbackList({
  title,
  items,
  color,
  icon,
}: {
  title: string;
  items: string[];
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.fbList}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {items.map((it, i) => (
        <View key={i} style={styles.fbItem}>
          <Ionicons name={icon} size={16} color={color} style={{ marginTop: 2 }} />
          <ThemedText type="small" style={styles.flex}>
            {it}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function ReviewBubble({ turn }: { turn: ReviewTurn }) {
  const theme = useTheme();
  const isWriter = turn.role === 'writer';
  return (
    <View
      style={[
        styles.bubble,
        isWriter ? styles.writer : styles.reviewer,
        {
          backgroundColor: isWriter ? theme.tint : theme.backgroundSelected,
        },
      ]}>
      <ThemedText
        type="small"
        style={{ color: isWriter ? theme.tintText : theme.text }}>
        {turn.text}
      </ThemedText>
    </View>
  );
}

function UsageLine({ account }: { account: Account }) {
  const theme = useTheme();
  const { capped, label, action } = usageSummary(account);
  const out = capped !== null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${action} AI usage`}
      onPress={() => router.push('/settings')}
      style={[styles.usageLine, { borderColor: out ? theme.danger : theme.border }]}>
      <Ionicons
        name={out ? 'alert-circle' : 'flash-outline'}
        size={16}
        color={out ? theme.danger : theme.tint}
      />
      <ThemedText type="small" style={[styles.flex, out && { color: theme.danger }]}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
        {action}
      </ThemedText>
    </Pressable>
  );
}

function ConnectAIPrompt() {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.connectRow}>
        <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          Add your own API key in Settings to get AI feedback.
        </ThemedText>
      </View>
      <Button title="Open Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill },
  badgeText: { color: '#fff', fontSize: Type.caption.fontSize, fontWeight: '700' },
  prompt: { fontStyle: 'italic' },
  title: { fontSize: Type.title.fontSize, fontWeight: '600', lineHeight: 32 },
  statsRow: { flexDirection: 'row', gap: Spacing.five },
  stat: { gap: 2 },
  statValue: { fontSize: Type.body.fontSize, fontWeight: '700' },
  body: { ...Type.writing, fontFamily: Fonts.serif },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  sectionTitle: { fontSize: Type.heading.fontSize, fontWeight: '600' },
  gradeTop: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  gradeCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  gradeBig: { color: '#fff', fontSize: Type.heading.fontSize, fontWeight: '600' },
  overall: { fontSize: Type.heading.fontSize, fontWeight: '600' },
  flex: { flex: 1 },
  scores: { gap: Spacing.two },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  scoreTrack: { flex: 1.4, height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  scoreNum: { width: 48, textAlign: 'right' },
  fbList: { gap: Spacing.one },
  fbItem: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  lineNotes: { gap: Spacing.two },
  lineNote: { borderLeftWidth: 3, paddingLeft: Spacing.three, gap: 2 },
  quote: { fontStyle: 'italic' },
  bubble: {
    maxWidth: '85%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
  },
  writer: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  reviewer: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.large,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: Type.body.fontSize,
    maxHeight: 120,
    paddingVertical: Spacing.two,
  },
  send: { width: 44, height: 44, borderRadius: Radius.large, alignItems: 'center', justifyContent: 'center' },
  connectRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  usageLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
