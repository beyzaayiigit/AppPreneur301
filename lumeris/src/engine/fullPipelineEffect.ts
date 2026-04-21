import { Skia } from '@shopify/react-native-skia';
import type { EditState } from './editState';
import { buildBaseColorMatrix } from './colorMatrix';

const hslUniforms = Array.from(
  { length: 8 },
  (_, i) =>
    `uniform float dh${i}; uniform float ds${i}; uniform float dl${i};`,
).join('\n');

function buildSksl(): string {
  const cmDecl = Array.from({ length: 20 }, (_, i) => `uniform float cm${i};`).join('\n');

  return `
uniform shader image;
uniform vec2 resolution;
${cmDecl}
${hslUniforms}
uniform float vignetteAmt;
uniform float fadeAmt;
uniform float grainAmt;

float angDist(float a, float b) {
  float d = abs(a - b);
  return min(d, 360.0 - d);
}

float zoneWeight(float hDeg, float center) {
  float d = angDist(hDeg, center);
  float hw = 28.0;
  return smoothstep(hw, 0.0, d);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

half4 main(float2 coord) {
  half4 base = image.eval(coord);
  float r = float(base.r);
  float g = float(base.g);
  float b = float(base.b);
  float a = float(base.a);
  float nr = cm0*r + cm1*g + cm2*b + cm3*a + cm4;
  float ng = cm5*r + cm6*g + cm7*b + cm8*a + cm9;
  float nb = cm10*r + cm11*g + cm12*b + cm13*a + cm14;
  float na = cm15*r + cm16*g + cm17*b + cm18*a + cm19;
  vec3 col = vec3(clamp(nr,0.0,1.0), clamp(ng,0.0,1.0), clamp(nb,0.0,1.0));
  vec3 hsv = rgb2hsv(col);
  float h = hsv.x * 360.0;
  float w0 = zoneWeight(h, 0.0);
  float w1 = zoneWeight(h, 30.0);
  float w2 = zoneWeight(h, 60.0);
  float w3 = zoneWeight(h, 120.0);
  float w4 = zoneWeight(h, 180.0);
  float w5 = zoneWeight(h, 240.0);
  float w6 = zoneWeight(h, 275.0);
  float w7 = zoneWeight(h, 315.0);
  float ws = w0+w1+w2+w3+w4+w5+w6+w7+1e-4;
  w0/=ws; w1/=ws; w2/=ws; w3/=ws; w4/=ws; w5/=ws; w6/=ws; w7/=ws;
  float dht = w0*dh0+w1*dh1+w2*dh2+w3*dh3+w4*dh4+w5*dh5+w6*dh6+w7*dh7;
  float dst = w0*ds0+w1*ds1+w2*ds2+w3*ds3+w4*ds4+w5*ds5+w6*ds6+w7*ds7;
  float dlt = w0*dl0+w1*dl1+w2*dl2+w3*dl3+w4*dl4+w5*dl5+w6*dl6+w7*dl7;
  hsv.x = fract(hsv.x + dht);
  hsv.y = clamp(hsv.y * (1.0 + dst), 0.0, 1.0);
  hsv.z = clamp(hsv.z + dlt, 0.0, 1.0);
  col = hsv2rgb(hsv);

  vec2 uv = coord / max(resolution, vec2(1.0));
  float d = distance(uv, vec2(0.5)) * 1.25;
  float vig = mix(1.0, smoothstep(0.95, 0.35, d), vignetteAmt);
  col *= vig;

  col = mix(col, vec3(1.0), fadeAmt * 0.35);
  col = mix(vec3(0.0), col, 1.0 - fadeAmt * 0.15);

  float n = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * grainAmt * 0.12;

  return half4(half(col.r), half(col.g), half(col.b), half(clamp(na,0.0,1.0)));
}
`;
}

let cached: ReturnType<typeof Skia.RuntimeEffect.Make> | null | undefined;

export function getFullPipelineEffect() {
  if (cached !== undefined) return cached;
  cached = Skia.RuntimeEffect.Make(buildSksl());
  return cached;
}

export function buildPipelineUniforms(
  state: EditState,
  resolution: { width: number; height: number },
): Record<string, number | number[]> {
  const cm = buildBaseColorMatrix(state);
  const u: Record<string, number | number[]> = {
    resolution: [resolution.width, resolution.height],
    vignetteAmt: Math.max(0, Math.min(1, state.vignette)),
    fadeAmt: Math.max(0, Math.min(1, state.fade)),
    grainAmt: Math.max(0, Math.min(1, state.grain)),
  };
  for (let i = 0; i < 20; i++) u[`cm${i}`] = cm[i] ?? 0;
  for (let i = 0; i < 8; i++) {
    const ch = state.hsl[i] ?? { h: 0, s: 0, l: 0 };
    u[`dh${i}`] = (ch.h / 100) * 0.12;
    u[`ds${i}`] = (ch.s / 100) * 0.55;
    u[`dl${i}`] = (ch.l / 100) * 0.22;
  }
  return u;
}
