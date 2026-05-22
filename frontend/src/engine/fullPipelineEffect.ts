import { Skia } from '@shopify/react-native-skia';
import type { EditState } from './editState';
import { buildBaseColorMatrix } from './colorMatrix';

/** Piksel tabanlı kumlama: kaba ince iki ölçek + güçlü genlik; sürüm değişince Skia önbelleği yenilenir */
const PIPELINE_VERSION = 9;

function buildSksl(): string {
  const cmDecl = Array.from({ length: 20 }, (_, i) => `uniform float cm${i};`).join('\n');

  return `
uniform shader image;
uniform vec2 resolution;
${cmDecl}
uniform float vignetteAmt;
uniform float fadeAmt;
uniform float grainAmt;
uniform float selSkin;
uniform float selSky;
uniform float selGreen;
uniform float selWarm;
uniform float sharpAmt;

half4 main(float2 coord) {
  half4 base = image.eval(coord);
  half4 n = image.eval(coord + vec2(0.0, -1.0));
  half4 s = image.eval(coord + vec2(0.0, 1.0));
  half4 e = image.eval(coord + vec2(1.0, 0.0));
  half4 w = image.eval(coord + vec2(-1.0, 0.0));
  float r = float(base.r);
  float g = float(base.g);
  float b = float(base.b);
  float a = float(base.a);
  float nr = cm0*r + cm1*g + cm2*b + cm3*a + cm4;
  float ng = cm5*r + cm6*g + cm7*b + cm8*a + cm9;
  float nb = cm10*r + cm11*g + cm12*b + cm13*a + cm14;
  float na = cm15*r + cm16*g + cm17*b + cm18*a + cm19;
  vec3 col = vec3(clamp(nr,0.0,1.0), clamp(ng,0.0,1.0), clamp(nb,0.0,1.0));

  vec2 uv = coord / max(resolution, vec2(1.0));
  float d = distance(uv, vec2(0.5)) * 1.25;
  float vig = mix(1.0, smoothstep(0.95, 0.35, d), vignetteAmt);
  col *= vig;

  col = mix(col, vec3(1.0), fadeAmt * 0.35);
  col = mix(vec3(0.0), col, 1.0 - fadeAmt * 0.15);

  // Selective Color Lite: maske tabanlı lokal renk düzeltmeleri.
  float maxc = max(col.r, max(col.g, col.b));
  float minc = min(col.r, min(col.g, col.b));
  float chroma = max(maxc - minc, 1e-5);
  float sat = chroma / max(maxc, 1e-5);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));

  float skinMask = smoothstep(0.02, 0.22, col.r - col.b)
    * smoothstep(0.0, 0.16, col.g - col.b)
    * smoothstep(0.06, 0.55, sat)
    * smoothstep(0.18, 0.85, luma);
  float skyMask = smoothstep(0.0, 0.22, col.b - max(col.r, col.g))
    * smoothstep(0.05, 0.58, sat)
    * (1.0 - smoothstep(0.7, 0.98, luma));
  float greenMask = smoothstep(0.0, 0.2, col.g - max(col.r, col.b))
    * smoothstep(0.05, 0.58, sat)
    * smoothstep(0.08, 0.92, luma);
  float warmMask = smoothstep(0.0, 0.2, col.r - col.b)
    * smoothstep(-0.02, 0.16, col.r - col.g)
    * smoothstep(0.05, 0.55, sat);

  vec3 gray = vec3(dot(col, vec3(0.2126, 0.7152, 0.0722)));
  col = mix(col, mix(gray, col, 1.0 + selSkin * 0.55), skinMask);
  col = mix(col, mix(gray, col, 1.0 + selSky * 0.62), skyMask);
  col = mix(col, mix(gray, col, 1.0 + selGreen * 0.55), greenMask);
  col = mix(col, mix(gray, col, 1.0 + selWarm * 0.48), warmMask);

  col.r += skinMask * selSkin * 0.11 + warmMask * selWarm * 0.085;
  col.b += skyMask * selSky * 0.14 - warmMask * selWarm * 0.04;
  col.g += greenMask * selGreen * 0.095;

  // Çok uç değerlerde yapay görünümü azalt.
  col = mix(col, vec3(luma), 0.08 * max(0.0, sat - 0.85));

  // Unsharp mask benzeri keskinlik: slider 1.0 nötr.
  float sh = clamp(sharpAmt, -1.0, 1.0);
  vec3 blur = (vec3(n.r, n.g, n.b) + vec3(s.r, s.g, s.b) + vec3(e.r, e.g, e.b) + vec3(w.r, w.g, w.b)) * 0.25;
  vec3 detail = vec3(r, g, b) - blur;
  float detailLuma = dot(abs(detail), vec3(0.299, 0.587, 0.114));
  float detailMask = smoothstep(0.01, 0.18, detailLuma);
  col += detail * sh * (0.9 * detailMask + 0.15);

  float ga = clamp(grainAmt, 0.0, 1.0);
  vec2 ip = floor(coord);
  float h0 = fract(sin(dot(ip, vec2(127.1, 311.7))) * 43758.5453123);
  float coarse = h0 - 0.5;
  vec2 ipFine = floor(coord * 1.82);
  float hf = fract(sin(dot(ipFine, vec2(189.1, 157.3))) * 37821.4567);
  float fine = hf - 0.5;
  float mono = coarse * 0.66 + fine * 0.34;
  float lumaMask = 0.45 + (1.0 - luma) * 0.55; // gölgede daha görünür, parlakta daha hafif
  float blotch = fract(sin(dot(floor(coord * 0.33), vec2(91.7, 43.1))) * 15731.0) - 0.5;
  float amp = (ga * ga * 0.22 + ga * 0.06) * lumaMask;
  amp *= 1.0 + blotch * ga * 0.35;
  float grainR = mono + (coarse * 0.16);
  float grainG = mono;
  float grainB = mono + (fine * 0.14);
  col += vec3(grainR, grainG, grainB) * amp;

  col = clamp(col, 0.0, 1.0);

  return half4(half(col.r), half(col.g), half(col.b), half(clamp(na,0.0,1.0)));
}
`;
}

let cachedEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | null | undefined;
let cachedVersion = 0;

export function getFullPipelineEffect() {
  if (cachedEffect !== undefined && cachedVersion === PIPELINE_VERSION) return cachedEffect;
  cachedEffect = Skia.RuntimeEffect.Make(buildSksl());
  cachedVersion = PIPELINE_VERSION;
  return cachedEffect;
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
    selSkin: Math.max(-1, Math.min(1, state.selectiveSkin)),
    selSky: Math.max(-1, Math.min(1, state.selectiveSky)),
    selGreen: Math.max(-1, Math.min(1, state.selectiveGreen)),
    selWarm: Math.max(-1, Math.min(1, state.selectiveWarm)),
    sharpAmt: Math.max(-1, Math.min(1, state.sharpness - 1)),
  };
  for (let i = 0; i < 20; i++) u[`cm${i}`] = cm[i] ?? 0;
  return u;
}
