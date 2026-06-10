import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_EDGE = 768;
const JPEG_QUALITY = 0.78;

/**
 * Resize image for AI analysis only — full-resolution edit stays on-device.
 */
export async function prepareAiThumbnail(imageUri: string): Promise<{
  base64: string;
  mimeType: 'image/jpeg';
}> {
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: MAX_EDGE } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (manipulated.base64) {
    return { base64: manipulated.base64, mimeType: 'image/jpeg' };
  }

  if (!manipulated.uri) {
    throw new Error('Thumbnail generation failed');
  }

  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { base64, mimeType: 'image/jpeg' };
}
