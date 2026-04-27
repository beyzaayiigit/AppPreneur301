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
import type { EditState } from '../engine/editState';
import { buildPipelineUniforms, getFullPipelineEffect } from '../engine/fullPipelineEffect';

type Props = {
  uri: string;
  state: EditState;
  compare: boolean;
  width: number;
  height: number;
  canvasRef: RefObject<CanvasRef | null>;
};

export function EditorCanvas({ uri, state, compare, width, height, canvasRef }: Props) {
  const skImage = useImage(uri);
  if (!skImage) return null;

  if (compare) {
    return (
      <Canvas ref={canvasRef} style={{ width, height }}>
        <Image image={skImage} x={0} y={0} width={width} height={height} fit="contain" />
      </Canvas>
    );
  }

  const effect = getFullPipelineEffect();
  const uniforms = buildPipelineUniforms(state, { width, height });

  if (!effect) {
    return (
      <Canvas ref={canvasRef} style={{ width, height }}>
        <Image image={skImage} x={0} y={0} width={width} height={height} fit="contain">
          <ColorMatrix matrix={buildBaseColorMatrix(state)} />
        </Image>
      </Canvas>
    );
  }

  return (
    <Canvas ref={canvasRef} style={{ width, height }}>
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
    </Canvas>
  );
}
