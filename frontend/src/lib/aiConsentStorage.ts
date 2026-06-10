import * as FileSystem from 'expo-file-system/legacy';

const CONSENT_FILE = `${FileSystem.documentDirectory ?? ''}lumeris_ai_consent.json`;

export async function isAiConsentGranted(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(CONSENT_FILE);
    if (!info.exists) return false;
    const raw = await FileSystem.readAsStringAsync(CONSENT_FILE);
    const data = JSON.parse(raw) as { granted?: boolean };
    return data.granted === true;
  } catch {
    return false;
  }
}

export async function saveAiConsentGranted(): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(CONSENT_FILE, JSON.stringify({ granted: true }));
}
