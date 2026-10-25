import { Platform } from 'react-native';

// Static web exports default to BYOK; native managed accounts remain available.
export const WEB_DEMO = Platform.OS === 'web' &&
  (process.env.EXPO_PUBLIC_WEB_DEMO === 'true' || !process.env.EXPO_PUBLIC_MANAGED_SERVER_URL);
