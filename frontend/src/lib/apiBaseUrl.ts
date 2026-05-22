import Constants from 'expo-constants';

type Extra = { lumerisApiBaseUrl?: string };

export function getLumerisApiBaseUrl(): string {
  const raw = (Constants.expoConfig?.extra as Extra | undefined)?.lumerisApiBaseUrl;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/$/, '');
}
