import {
  Canvas,
  ColorMatrix,
  Image,
  ImageShader,
  Rect,
  Shader,
  useImage,
  type CanvasRef,
} from '@shopify/react-native-skia';
import type { RefObject } from 'react';
import { buildBaseColorMatrix } from '../engine/colorMatrix';
import { createDefaultEditState, type EditState } from '../engine/editState';
import { buildPipelineUniforms, getFullPipelineEffect } from '../engine/fullPipelineEffect';

type Props = {
  uri: string;
  state: EditState;
  /** Basılı tutunca (Adjust): işlenmemiş / orijinal görünüm (varsayılan pipeline, preset yok). */
  compareBefore: boolean;
  width: number;
  height: number;
  canvasRef: RefObject<CanvasRef | null>;
};

function EditedImageTree({
  skImage,
  state,
  width,
  height,
}: {
  skImage: NonNullable<ReturnType<typeof useImage>>;
  state: EditState;
  width: number;
  height: number;
}) {
  const effect = getFullPipelineEffect();
  const uniforms = buildPipelineUniforms(state, { width, height });

  if (!effect) {
    return (
      <Image image={skImage} x={0} y={0} width={width} height={height} fit="contain">
        <ColorMatrix matrix={buildBaseColorMatrix(state)} />
      </Image>
    );
  }

  return (
    <Rect x={0} y={0} width={width} height={height}>
      <Shader source={effect} uniforms={uniforms}>
        <ImageShader
          image={skImage}
          tx="clamp"
          ty="clamp"
          fit="contain"
          x={0}
          y={0}
          width={width}
          height={height}
        />
      </Shader>
    </Rect>
  );
}

export function EditorCanvas({
  uri,
  state,
  compareBefore,
  width,
  height,
  canvasRef,
}: Props) {
  const skImage = useImage(uri);

  if (!skImage) return null;

  if (compareBefore) {
    const baseline = createDefaultEditState();
    return (
      <Canvas ref={canvasRef} style={{ width, height }}>
        <EditedImageTree skImage={skImage} state={baseline} width={width} height={height} />
      </Canvas>
    );
  }

  return (
    <Canvas ref={canvasRef} style={{ width, height }}>
      <EditedImageTree skImage={skImage} state={state} width={width} height={height} />
    </Canvas>
  );
}
