import Constants from 'expo-constants';

type Extra = { lumerisApiBaseUrl?: string };

/** EXPO_PUBLIC_LUMERIS_API_BASE_URL (.env) overrides app.json for local device/emulator testing. */
export function getLumerisApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_LUMERIS_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  const raw = (Constants.expoConfig?.extra as Extra | undefined)?.lumerisApiBaseUrl;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/$/, '');
}
