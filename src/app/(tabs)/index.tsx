import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown, type DropdownOption } from "@/components/ui/dropdown";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { generateAIPrompt, resolveAIConfig, type AIConfig } from "@/lib/ai";
import { ApiError, getAccount, type Account } from "@/lib/api";
import { GENRES, getGenre } from "@/lib/genres";
import { generateNewsPrompt } from "@/lib/news";
import { generatePrompt, generateSurprisePrompt } from "@/lib/prompts";
import { getSettings, saveSettings, type AppSettings } from "@/lib/storage";
import type { GenreId, Prompt } from "@/lib/types";

const GENRE_OPTIONS: DropdownOption<GenreId>[] = GENRES.map((g) => ({
  label: g.label,
  value: g.id,
  emoji: g.emoji,
}));

const WORD_OPTIONS: DropdownOption<number>[] = [
  { label: "Free write", value: 0 },
  { label: "100 words", value: 100 },
  { label: "250 words", value: 250 },
  { label: "500 words", value: 500 },
  { label: "750 words", value: 750 },
  { label: "1000 words", value: 1000 },
];

const TIMER_OPTIONS: DropdownOption<number>[] = [
  { label: "No timer", value: 0 },
  { label: "5 min", value: 5 * 60 },
  { label: "10 min", value: 10 * 60 },
  { label: "15 min", value: 15 * 60 },
  { label: "25 min", value: 25 * 60 },
];

export default function WriteScreen() {
  const theme = useTheme();
  const [genre, setGenre] = useState<GenreId>("journalism");
  const [prompt, setPrompt] = useState<Prompt>(() =>
    generatePrompt("journalism"),
  );
  const [wordTarget, setWordTarget] = useState(250);
  const [durationSec, setDurationSec] = useState(0);
  const [settings, setSettings] = useState<AppSettings>({});
  const [account, setAccount] = useState<Account | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [newsBusy, setNewsBusy] = useState(false);

  const refreshAccount = useCallback((cfg: AIConfig | null) => {
    if (cfg?.mode !== "managed") {
      setAccount(null);
      return;
    }
    getAccount(cfg.backendUrl, cfg.token)
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  // Restore last-used filters and account state whenever the tab gains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (!active) return;
        setSettings(s);
        if (s.lastGenre) {
          const g = s.lastGenre as GenreId;
          setGenre(g);
          setPrompt((prev) => (prev.genre === g ? prev : generatePrompt(g)));
        }
        if (typeof s.lastWordTarget === "number")
          setWordTarget(s.lastWordTarget);
        if (typeof s.lastDurationSec === "number")
          setDurationSec(s.lastDurationSec);
        refreshAccount(resolveAIConfig(s));
      });
      return () => {
        active = false;
      };
    }, [refreshAccount]),
  );

  const activeGenre = getGenre(genre);

  function pickGenre(id: GenreId) {
    setGenre(id);
    setPrompt(generatePrompt(id));
  }

  function shuffle() {
    setPrompt(generatePrompt(genre));
  }

  function surprise() {
    const p = generateSurprisePrompt();
    setGenre(p.genre);
    setPrompt(p);
  }

  async function aiPrompt() {
    const cfg = resolveAIConfig(settings);
    if (!cfg) {
      router.push("/settings");
      return;
    }
    setAiBusy(true);
    try {
      const p = await generateAIPrompt(genre, wordTarget, cfg);
      setPrompt(p);
      refreshAccount(cfg);
    } catch (e) {
      handleAiError(e);
    } finally {
      setAiBusy(false);
    }
  }

  // Journalism: seed a prompt from a live headline (falls back to offline).
  async function newsPrompt() {
    setNewsBusy(true);
    try {
      setPrompt(await generateNewsPrompt());
    } catch {
      const msg =
        "Couldn’t reach the news right now — here’s an offline investigative prompt.";
      setPrompt(generatePrompt("journalism"));
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Offline", msg);
      }
    } finally {
      setNewsBusy(false);
    }
  }

  function handleAiError(e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not generate a prompt.";
    const quota = e instanceof ApiError && e.code === "quota_exceeded";
    if (Platform.OS === "web") {
      alert(msg);
      if (quota) router.push("/settings");
    } else if (quota) {
      Alert.alert("Monthly limit reached", msg, [
        { text: "Not now", style: "cancel" },
        { text: "Upgrade", onPress: () => router.push("/settings") },
      ]);
    } else {
      Alert.alert("Heads up", msg);
    }
  }

  function start() {
    saveSettings({
      lastGenre: genre,
      lastWordTarget: wordTarget,
      lastDurationSec: durationSec,
    });
    router.push({
      pathname: "/session",
      params: {
        promptId: prompt.id,
        promptText: prompt.text,
        genre: prompt.genre,
        tip: prompt.tip ?? "",
        wordTarget: String(wordTarget),
        durationSec: String(durationSec),
      },
    });
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Today’s practice
              </ThemedText>
              <ThemedText style={styles.brand}>Write Better</ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Settings"
              onPress={() => router.push("/settings")}
              hitSlop={10}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>

          {settings.aiMode === "managed" && account && (
            <UsagePill account={account} />
          )}

          {/* Prompt card */}
          <Card style={{ borderColor: activeGenre.accent }}>
            <View style={styles.promptTop}>
              <View
                style={[styles.badge, { backgroundColor: activeGenre.accent }]}
              >
                <ThemedText style={styles.badgeText}>
                  {activeGenre.emoji} {activeGenre.label}
                </ThemedText>
              </View>
              <View style={styles.promptActions}>
                <Pressable
                  onPress={shuffle}
                  hitSlop={8}
                  accessibilityLabel="New prompt"
                  disabled={aiBusy}
                >
                  <Ionicons
                    name="shuffle"
                    size={22}
                    color={theme.textSecondary}
                  />
                </Pressable>
                <Pressable
                  onPress={surprise}
                  hitSlop={8}
                  accessibilityLabel="Surprise me"
                  disabled={aiBusy}
                >
                  <Ionicons
                    name="dice-outline"
                    size={22}
                    color={theme.textSecondary}
                  />
                </Pressable>
                {genre === "journalism" && (
                  <Pressable
                    onPress={newsPrompt}
                    hitSlop={8}
                    disabled={newsBusy || aiBusy}
                    accessibilityLabel="Prompt from a current headline"
                    style={[styles.newsBtn, { borderColor: theme.border }]}
                  >
                    {newsBusy ? (
                      <ActivityIndicator size="small" color={theme.text} />
                    ) : (
                      <>
                        <Ionicons
                          name="newspaper-outline"
                          size={14}
                          color={theme.text}
                        />
                        <ThemedText style={styles.newsBtnText}>
                          Headline
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                )}
                <Pressable
                  onPress={aiPrompt}
                  hitSlop={8}
                  disabled={aiBusy}
                  accessibilityLabel="Generate prompt with AI"
                  style={[
                    styles.aiBtn,
                    { backgroundColor: activeGenre.accent },
                  ]}
                >
                  {aiBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={14} color="#fff" />
                      <ThemedText style={styles.aiBtnText}>AI</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            <ThemedText style={styles.promptText}>{prompt.text}</ThemedText>

            {!!prompt.tip && (
              <View style={[styles.tip, { borderTopColor: theme.border }]}>
                <Ionicons
                  name="bulb-outline"
                  size={16}
                  color={theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.tipText}
                >
                  {prompt.tip}
                </ThemedText>
              </View>
            )}
          </Card>

          {/* Compact filters — one line */}
          <View style={styles.filterRow}>
            <Dropdown
              caption="Genre"
              value={genre}
              options={GENRE_OPTIONS}
              accent={activeGenre.accent}
              onChange={pickGenre}
            />
            <Dropdown
              caption="Length"
              value={wordTarget}
              options={WORD_OPTIONS}
              onChange={setWordTarget}
            />
            <Dropdown
              caption="Timer"
              value={durationSec}
              options={TIMER_OPTIONS}
              onChange={setDurationSec}
            />
          </View>

          <Button
            title="Start writing"
            size="lg"
            onPress={start}
            style={styles.startBtn}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function UsagePill({ account }: { account: Account }) {
  const theme = useTheme();
  const unlimited = account.usage.limit < 0;
  const remaining = unlimited
    ? Infinity
    : Math.max(0, account.usage.limit - account.usage.used);
  const out = !unlimited && remaining === 0;
  const label = unlimited
    ? "Pro · unlimited AI this month"
    : out
      ? "No AI uses left this month"
      : `${remaining} of ${account.usage.limit} AI uses left this month`;

  return (
    <Pressable
      onPress={() => router.push("/settings")}
      style={[
        styles.usagePill,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: out ? theme.danger : theme.border,
        },
      ]}
    >
      <Ionicons
        name={unlimited ? "infinite" : out ? "alert-circle" : "flash-outline"}
        size={16}
        color={out ? theme.danger : theme.tint}
      />
      <ThemedText
        type="small"
        style={[styles.usageText, out && { color: theme.danger }]}
      >
        {label}
      </ThemedText>
      {!unlimited && (
        <ThemedText
          type="small"
          style={{ color: theme.tint, fontWeight: "700" }}
        >
          {out ? "Upgrade" : "Manage"}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { fontSize: 30, fontWeight: "800", lineHeight: 36 },
  promptTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  promptActions: {
    flexDirection: "row",
    gap: Spacing.three,
    alignItems: "center",
  },
  newsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  newsBtnText: { fontSize: 12, fontWeight: "700" },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 48,
    justifyContent: "center",
  },
  aiBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  usagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  usageText: { flex: 1 },
  promptText: { fontSize: 21, lineHeight: 30, fontWeight: "500" },
  tip: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  tipText: { flex: 1 },
  filterRow: { flexDirection: "row", gap: Spacing.two, alignItems: "stretch" },
  startBtn: { marginTop: Spacing.two },
});
