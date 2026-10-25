import { beforeEach, expect, it, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import { migrateKeys, readKeys, writeKeys } from './key-store';
import { getSettings, saveSettings } from './storage';
const mocks = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  local: new Map<string, string>(), secure: new Map<string, string>(),
}));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: vi.fn(async (key: string) => mocks.local.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => { mocks.local.set(key, value); }),
  removeItem: vi.fn(async (key: string) => { mocks.local.delete(key); }),
} }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => mocks.secure.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { mocks.secure.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { mocks.secure.delete(key); }),
}));
beforeEach(() => { mocks.local.clear(); mocks.secure.clear(); mocks.platform.OS = 'ios'; });
it.each(['ios', 'android'])('encrypts keys on %s and supports deletion', async (platform) => {
  mocks.platform.OS = platform;
  await writeKeys({ anthropic: 'sk-ant-fake-test' });
  expect(await readKeys()).toEqual({ anthropic: 'sk-ant-fake-test' });
  expect(mocks.local.size).toBe(0);
  await writeKeys({ anthropic: undefined });
  expect(await readKeys()).toEqual({});
});
it('uses only unencrypted local storage on web', async () => {
  mocks.platform.OS = 'web';
  await writeKeys({ openai: 'sk-fake-test' });
  expect(await readKeys()).toEqual({ openai: 'sk-fake-test' });
  expect(mocks.secure.size).toBe(0);
  await writeKeys({ openai: undefined });
  expect(await readKeys()).toEqual({});
});
it.each(['ios', 'web'])('migrates old settings and preserves other preferences on %s', async (platform) => {
  mocks.platform.OS = platform;
  const legacy = { provider: 'anthropic', lastGenre: 'poetry', apiKeys: { anthropic: 'sk-ant-fake-test' } };
  mocks.local.set('wb:settings', JSON.stringify(legacy));
  expect(await migrateKeys(legacy)).toEqual(legacy.apiKeys);
  expect(JSON.parse(mocks.local.get('wb:settings')!)).toEqual({ provider: 'anthropic', lastGenre: 'poetry' });
  expect(await migrateKeys({})).toEqual(legacy.apiKeys);
});
it('keeps plaintext available for retry if secure migration fails', async () => {
  const legacy = { apiKeys: { anthropic: 'sk-ant-fake-test' } };
  mocks.local.set('wb:settings', JSON.stringify(legacy));
  vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('unavailable'));
  await expect(migrateKeys(legacy)).rejects.toThrow('unavailable');
  expect(JSON.parse(mocks.local.get('wb:settings')!)).toEqual(legacy);
});
it('does not overwrite a newer secure key with a legacy key', async () => {
  await writeKeys({ anthropic: 'sk-ant-new-fake' });
  expect(await migrateKeys({ apiKeys: { anthropic: 'sk-ant-old-fake' } })).toEqual({ anthropic: 'sk-ant-new-fake' });
});

it('hydrates settings while keeping keys out of the settings JSON', async () => {
  await saveSettings({ provider: 'anthropic', lastGenre: 'poetry', apiKeys: { anthropic: 'sk-ant-fake-test' } });
  expect(JSON.parse(mocks.local.get('wb:settings')!)).toEqual({ provider: 'anthropic', lastGenre: 'poetry' });
  expect(await getSettings()).toMatchObject({ apiKeys: { anthropic: 'sk-ant-fake-test' }, lastGenre: 'poetry' });
  await saveSettings({ lastWordTarget: 500 });
  expect(await readKeys()).toEqual({ anthropic: 'sk-ant-fake-test' });
  expect(mocks.local.get('wb:settings')).not.toContain('sk-ant');
});
