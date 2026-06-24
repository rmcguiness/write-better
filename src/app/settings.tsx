import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  getAccount,
  logIn,
  openBillingPortal,
  signUp,
  startCheckout,
  type Account,
} from '@/lib/api';
import { defaultModel, getProvider, PROVIDERS, type ProviderId } from '@/lib/providers';
import { getSettings, saveSettings, type AIMode, type AppSettings } from '@/lib/storage';

const DEFAULT_BACKEND = 'http://localhost:8787';

export default function SettingsScreen() {
  const theme = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({});

  // BYOK working state
  const [provider, setProvider] = useState<ProviderId>('anthropic');
  const [model, setModel] = useState<string>(defaultModel('anthropic'));
  const [keyDraft, setKeyDraft] = useState('');
  const [reveal, setReveal] = useState(false);

  // Managed working state
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: AIMode = settings.aiMode ?? 'byok';

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      const p = (s.provider ?? 'anthropic') as ProviderId;
      setProvider(p);
      setModel(s.model ?? defaultModel(p));
      setKeyDraft(s.apiKeys?.[p] ?? '');
      setBackendUrl(s.backendUrl ?? DEFAULT_BACKEND);
      setEmail(s.authEmail ?? '');
      setLoaded(true);
      if (s.aiMode === 'managed' && s.backendUrl && s.authToken) {
        refreshAccount(s.backendUrl, s.authToken);
      }
    });
  }, []);

  async function setMode(next: AIMode) {
    const updated = await saveSettings({ aiMode: next });
    setSettings(updated);
  }

  function pickProvider(p: ProviderId) {
    setProvider(p);
    setModel(settings.model && settings.provider === p ? settings.model : defaultModel(p));
    setKeyDraft(settings.apiKeys?.[p] ?? '');
  }

  async function saveByok() {
    const updated = await saveSettings({
      aiMode: 'byok',
      provider,
      model,
      apiKeys: { ...settings.apiKeys, [provider]: keyDraft.trim() || undefined },
    });
    setSettings(updated);
    flash();
  }

  const [savedFlash, setSavedFlash] = useState(false);
  function flash() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  async function refreshAccount(url: string, token: string) {
    try {
      setAccount(await getAccount(url, token));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Token expired — drop it.
        const updated = await saveSettings({ authToken: undefined });
        setSettings(updated);
        setAccount(null);
      }
    }
  }

  async function authenticate(kind: 'login' | 'signup') {
    setBusy(true);
    setError(null);
    try {
      const fn = kind === 'login' ? logIn : signUp;
      const { token, account: acc } = await fn(backendUrl, email.trim(), password);
      const updated = await saveSettings({
        aiMode: 'managed',
        backendUrl,
        authToken: token,
        authEmail: email.trim(),
      });
      setSettings(updated);
      setAccount(acc);
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const updated = await saveSettings({ authToken: undefined });
    setSettings(updated);
    setAccount(null);
  }

  async function openExternal(getUrl: () => Promise<string>) {
    if (!settings.backendUrl || !settings.authToken) return;
    setBusy(true);
    setError(null);
    try {
      const url = await getUrl();
      await WebBrowser.openBrowserAsync(url);
      // Refresh in case they upgraded.
      refreshAccount(settings.backendUrl, settings.authToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open billing.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <ThemedView style={styles.fill} />;

  const providerInfo = getProvider(provider);
  const signedIn = !!settings.authToken && !!account;

  return (
    <ThemedView style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Mode toggle */}
        <Card>
          <ThemedText style={styles.cardTitle}>How AI is powered</ThemedText>
          <View style={styles.segment}>
            <SegmentButton
              label="Use my account"
              sub="We handle the AI; pick a plan"
              active={mode === 'managed'}
              onPress={() => setMode('managed')}
            />
            <SegmentButton
              label="Bring my own key"
              sub="Use your own provider key"
              active={mode === 'byok'}
              onPress={() => setMode('byok')}
            />
          </View>
        </Card>

        {mode === 'byok' ? (
          <Card>
            <ThemedText style={styles.cardTitle}>Provider</ThemedText>
            <View style={styles.wrap}>
              {PROVIDERS.map((p) => (
                <Chip key={p.id} label={p.label} selected={p.id === provider} onPress={() => pickProvider(p.id)} />
              ))}
            </View>

            <ThemedText type="smallBold" style={styles.mt}>
              Model
            </ThemedText>
            <View style={styles.wrap}>
              {providerInfo.models.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.label}${m.tier === 'fast' ? ' · cheapest' : m.tier === 'best' ? ' · best' : ''}`}
                  selected={m.id === model}
                  onPress={() => setModel(m.id)}
                />
              ))}
            </View>

            <View style={styles.keyRow}>
              <ThemedText type="smallBold">{providerInfo.label} API key</ThemedText>
              <Pressable onPress={() => Linking.openURL(providerInfo.getKeyUrl)}>
                <ThemedText type="small" style={{ color: theme.tint }}>
                  Get a key ↗
                </ThemedText>
              </Pressable>
            </View>
            <View style={[styles.inputRow, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder={providerInfo.keyHint}
                placeholderTextColor={theme.textSecondary}
                value={keyDraft}
                onChangeText={setKeyDraft}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!reveal}
              />
              <Ionicons
                name={reveal ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textSecondary}
                onPress={() => setReveal((r) => !r)}
              />
            </View>

            <Button title={savedFlash ? 'Saved ✓' : 'Save'} onPress={saveByok} />
            <ThemedText type="small" themeColor="textSecondary">
              Your key is stored only on this device and sent straight to {providerInfo.label}.
            </ThemedText>
          </Card>
        ) : (
          <>
            <Card>
              <ThemedText style={styles.cardTitle}>Server</ThemedText>
              <View style={[styles.inputRow, { borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="https://your-backend.example.com"
                  placeholderTextColor={theme.textSecondary}
                  value={backendUrl}
                  onChangeText={setBackendUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {!signedIn ? (
                <>
                  <View style={[styles.inputRow, { borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Email"
                      placeholderTextColor={theme.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={[styles.inputRow, { borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Password"
                      placeholderTextColor={theme.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                  {!!error && (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {error}
                    </ThemedText>
                  )}
                  <Button title="Sign in" loading={busy} onPress={() => authenticate('login')} />
                  <Button
                    title="Create account"
                    variant="ghost"
                    onPress={() => authenticate('signup')}
                  />
                </>
              ) : (
                <AccountPanel
                  account={account!}
                  busy={busy}
                  error={error}
                  onUpgrade={() => openExternal(() => startCheckout(settings.backendUrl!, settings.authToken!))}
                  onManage={() => openExternal(() => openBillingPortal(settings.backendUrl!, settings.authToken!))}
                  onSignOut={signOut}
                />
              )}
            </Card>
          </>
        )}

        <Card>
          <ThemedText type="smallBold">Multiple AIs, your choice</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Bring your own key from Anthropic (Claude), OpenAI (ChatGPT), or xAI (Grok) — or skip the
            setup and use a plan on your account. Note: a chat membership (ChatGPT Plus, Claude Pro,
            Grok) is not an API key; you create API keys in each provider’s developer console.
          </ThemedText>
        </Card>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          Write Better · {Platform.OS}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function AccountPanel({
  account,
  busy,
  error,
  onUpgrade,
  onManage,
  onSignOut,
}: {
  account: Account;
  busy: boolean;
  error: string | null;
  onUpgrade: () => void;
  onManage: () => void;
  onSignOut: () => void;
}) {
  const theme = useTheme();
  const unlimited = account.usage.limit < 0;
  const pct = unlimited ? 0 : Math.min(1, account.usage.used / Math.max(1, account.usage.limit));
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={styles.acctRow}>
        <Ionicons name="person-circle-outline" size={24} color={theme.text} />
        <View style={styles.flex}>
          <ThemedText type="smallBold">{account.email}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {account.plan === 'pro' ? 'Pro plan' : 'Free plan'}
          </ThemedText>
        </View>
        <View style={[styles.planPill, { backgroundColor: account.plan === 'pro' ? theme.tint : theme.backgroundSelected }]}>
          <ThemedText type="small" style={{ color: account.plan === 'pro' ? theme.tintText : theme.text, fontWeight: '700' }}>
            {account.plan.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View>
        <View style={styles.usageRow}>
          <ThemedText type="small" themeColor="textSecondary">
            This month
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {unlimited ? `${account.usage.used} used` : `${account.usage.used} / ${account.usage.limit}`}
          </ThemedText>
        </View>
        {!unlimited && (
          <View style={[styles.usageTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.usageFill, { width: `${pct * 100}%`, backgroundColor: pct >= 1 ? theme.danger : theme.tint }]} />
          </View>
        )}
      </View>

      {!!error && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}

      {account.plan === 'pro' ? (
        <Button title="Manage subscription" variant="secondary" loading={busy} onPress={onManage} />
      ) : (
        <Button title="Upgrade to Pro" loading={busy} onPress={onUpgrade} icon={<Ionicons name="rocket" size={18} color={theme.tintText} />} />
      )}
      <Button title="Sign out" variant="ghost" onPress={onSignOut} />
    </View>
  );
}

function SegmentButton({
  label,
  sub,
  active,
  onPress,
}: {
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segBtn,
        {
          backgroundColor: active ? theme.tint : theme.backgroundElement,
          borderColor: active ? theme.tint : theme.border,
        },
      ]}>
      <ThemedText style={[styles.segLabel, { color: active ? theme.tintText : theme.text }]}>{label}</ThemedText>
      <ThemedText type="small" style={{ color: active ? theme.tintText : theme.textSecondary }}>
        {sub}
      </ThemedText>
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
  cardTitle: { fontSize: 18, fontWeight: '800' },
  segment: { flexDirection: 'row', gap: Spacing.two },
  segBtn: { flex: 1, borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: 2 },
  segLabel: { fontSize: 15, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  mt: { marginTop: Spacing.two },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Spacing.two },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.three,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  flex: { flex: 1 },
  acctRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  planPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  usageTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
  footer: { textAlign: 'center', marginTop: Spacing.three },
});
