import * as Sharing from 'expo-sharing';

/** JPEG dosyasını sistem paylaşım sayfasına açar (WhatsApp vb. için mimeType gerekli). */
export async function shareImageFile(localUri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Paylaşım bu cihazda kullanılamıyor.');
  }
  const uri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;
  await Sharing.shareAsync(uri, {
    mimeType: 'image/jpeg',
    dialogTitle: 'Lumeris',
    UTI: 'public.jpeg',
  });
}
