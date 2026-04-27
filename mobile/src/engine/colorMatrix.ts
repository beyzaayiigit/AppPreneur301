import type { EditState } from './editState';
import { getPresetMatrix } from './presets';

export const IDENTITY_MATRIX = [
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
];

/** 4×5 homojen çarpım: önce B, sonra A uygulanır → C = A×B (5×5 genişletilmiş). */
export function multiplyColorMatrices(a: number[], b: number[]): number[] {
  const A = to5x5(a);
  const B = to5x5(b);
  const C = mat5Mul(A, B);
  return from5x5(C);
}

function to5x5(m: number[]): number[][] {
  return [
    [m[0], m[1], m[2], m[3], m[4]],
    [m[5], m[6], m[7], m[8], m[9]],
    [m[10], m[11], m[12], m[13], m[14]],
    [m[15], m[16], m[17], m[18], m[19]],
    [0, 0, 0, 0, 1],
  ];
}

function from5x5(M: number[][]): number[] {
  return [
    M[0][0], M[0][1], M[0][2], M[0][3], M[0][4],
    M[1][0], M[1][1], M[1][2], M[1][3], M[1][4],
    M[2][0], M[2][1], M[2][2], M[2][3], M[2][4],
    M[3][0], M[3][1], M[3][2], M[3][3], M[3][4],
  ];
}

function mat5Mul(A: number[][], B: number[][]): number[][] {
  const R: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      for (let k = 0; k < 5; k++) R[i][j] += A[i][k] * B[k][j];
    }
  }
  return R;
}

function exposureMatrix(ev: number): number[] {
  const s = Math.pow(2, ev);
  return [s, 0, 0, 0, 0, 0, s, 0, 0, 0, 0, 0, s, 0, 0, 0, 0, 0, 1, 0];
}

function contrastMatrix(c: number): number[] {
  const o = 0.5 * (1 - c);
  return [c, 0, 0, 0, o, 0, c, 0, 0, o, 0, 0, c, 0, o, 0, 0, 0, 1, 0];
}

function saturationMatrix(sat: number): number[] {
  const lumR = 0.3086;
  const lumG = 0.6094;
  const lumB = 0.082;
  const inv = 1 - sat;
  const r = inv * lumR;
  const g = inv * lumG;
  const b = inv * lumB;
  return [r + sat, g, b, 0, 0, r, g + sat, b, 0, 0, r, g, b + sat, 0, 0, 0, 0, 0, 1, 0];
}

function temperatureMatrix(t: number): number[] {
  const w = t * 0.18;
  return [1 + w, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1 - w, 0, 0, 0, 0, 0, 1, 0];
}

/** Temel ayarlar + LUT yoğunluğu birleşik 20’li matris (HSL shader öncesi). */
export function buildBaseColorMatrix(state: EditState): number[] {
  const preset = getPresetMatrix(state.presetIndex, state.presetIntensity / 100);
  let m = [...IDENTITY_MATRIX];
  m = multiplyColorMatrices(exposureMatrix(state.exposure), m);
  m = multiplyColorMatrices(contrastMatrix(state.contrast), m);
  m = multiplyColorMatrices(saturationMatrix(state.saturation), m);
  m = multiplyColorMatrices(temperatureMatrix(state.temperature), m);
  m = multiplyColorMatrices(preset, m);
  return m;
}
