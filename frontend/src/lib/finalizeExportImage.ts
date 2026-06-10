import * as ImageManipulator from 'expo-image-manipulator';
import type { ExportLayout } from './exportCapture';

/** Önizleme snapshot'ını hedef çözünürlüğe ölçekler (shader WYSIWYG kalır). */
export async function upscaleExportJpeg(sourceUri: string, layout: ExportLayout): Promise<string> {
  const targetW = Math.max(1, Math.round(layout.cropRect.width));
  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: targetW } }],
    {
      compress: layout.jpegQuality / 100,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  if (!result.uri) {
    throw new Error('Dışa aktarma ölçeklemesi başarısız.');
  }
  return result.uri;
}
