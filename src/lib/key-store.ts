import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type Keys = Partial<Record<'anthropic' | 'openai' | 'xai', string>>;
const providers = ['anthropic', 'openai', 'xai'] as const;
const keyName = (provider: string) => `wb.keys.${provider}`;

export async function writeKeys(keys: Keys): Promise<void> {
  for (const provider of providers) {
    if (!(provider in keys)) continue;
    const key = keys[provider];
    const name = keyName(provider);
    // Web AsyncStorage uses localStorage, which is NOT encrypted.
    if (Platform.OS === 'web') {
      if (key) await AsyncStorage.setItem(name, key);
      else await AsyncStorage.removeItem(name);
    } else {
      if (key) await SecureStore.setItemAsync(name, key);
      else await SecureStore.deleteItemAsync(name);
    }
  }
}

export async function readKeys(): Promise<Keys> {
  const keys: Keys = {};
  for (const provider of providers) {
    const name = keyName(provider);
    const key = Platform.OS === 'web'
      ? await AsyncStorage.getItem(name)
      : await SecureStore.getItemAsync(name);
    if (key) keys[provider] = key;
  }
  return keys;
}

export async function migrateKeys(settings: { apiKeys?: Keys }): Promise<Keys> {
  const stored = await readKeys();
  if (settings.apiKeys) {
    // Only remove legacy plaintext after every secure write succeeds. Retry on failure.
    await writeKeys({ ...settings.apiKeys, ...stored });
    const { apiKeys: _legacy, ...rest } = settings;
    await AsyncStorage.setItem('wb:settings', JSON.stringify(rest));
    return { ...settings.apiKeys, ...stored };
  }
  return stored;
}
