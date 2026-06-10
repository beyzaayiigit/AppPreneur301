import { StyleSheet, View } from 'react-native';
import type { AdjustKey } from '../engine/editState';

const DOT = 3.5;

/** Looks — alt nav: 6 nokta çiçek */
export function LooksFlowerGlyph({ color, size = 22 }: { color: string; size?: number }) {
  const r = (size - DOT) / 2 - 1;
  const cx = size / 2 - DOT / 2;
  const cy = size / 2 - DOT / 2;
  const angles = [0, 60, 120, 180, 240, 300].map((d) => (d * Math.PI) / 180);
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      {angles.map((rad, i) => (
        <View
          key={i}
          style={[
            g.dot,
            {
              backgroundColor: color,
              left: cx + Math.cos(rad) * r - DOT / 2,
              top: cy + Math.sin(rad) * r - DOT / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** AI — alt nav: üç nokta + merkez vurgu */
export function AiSparkGlyph({ color, size = 20 }: { color: string; size?: number }) {
  const d = 3;
  const cx = size / 2 - d / 2;
  const cy = size / 2 - d / 2;
  const r = size * 0.32;
  const pts = [
    { x: cx, y: cy - r },
    { x: cx - r * 0.87, y: cy + r * 0.5 },
    { x: cx + r * 0.87, y: cy + r * 0.5 },
  ];
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      {pts.map((p, i) => (
        <View
          key={i}
          style={[g.dot, { backgroundColor: color, left: p.x, top: p.y, width: d, height: d, borderRadius: d / 2 }]}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: cx - 2,
          top: cy - 2,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: color,
          opacity: 0.45,
        }}
      />
    </View>
  );
}

/** Adjust — alt nav: üç çizgi */
export function SlidersNavGlyph({
  color,
  active,
  size = 20,
}: {
  color: string;
  active: boolean;
  size?: number;
}) {
  const w = size * 0.85;
  return (
    <View style={[g.col, { width: size, height: size * 0.55 }]}>
      <View style={[g.bar, { width: w * 0.55, backgroundColor: color, opacity: active ? 1 : 0.5 }]} />
      <View style={[g.bar, { width: w, backgroundColor: color }]} />
      <View style={[g.bar, { width: w * 0.72, backgroundColor: color, opacity: active ? 1 : 0.5 }]} />
    </View>
  );
}

/** Seçili kategorideki her araç için çizgisel ikon */
export function AdjustToolGlyph({ tool, color, size = 26 }: { tool: AdjustKey; color: string; size?: number }) {
  const s = size ?? 26;
  switch (tool) {
    case 'exposure':
      return <ExposureGlyph color={color} size={s} />;
    case 'contrast':
      return <ContrastGlyph color={color} size={s} />;
    case 'temperature':
      return <WarmthGlyph color={color} size={s} />;
    case 'saturation':
      return <SaturationGlyph color={color} size={s} />;
    case 'pop':
      return <PopGlyph color={color} size={s} />;
    case 'selectiveSkin':
      return <SkinGlyph color={color} size={s} />;
    case 'selectiveSky':
      return <SkyGlyph color={color} size={s} />;
    case 'selectiveGreen':
      return <GreenGlyph color={color} size={s} />;
    case 'selectiveWarm':
      return <WarmSelectGlyph color={color} size={s} />;
    case 'sharpness':
      return <SharpnessGlyph color={color} size={s} />;
    case 'grain':
      return <GrainGlyph color={color} size={s} />;
    case 'fade':
      return <FadeGlyph color={color} size={s} />;
    case 'vignette':
      return <VignetteGlyph color={color} size={s} />;
    default:
      return <View style={{ width: s, height: s }} />;
  }
}

function ExposureGlyph({ color, size }: { color: string; size: number }) {
  const d = size * 0.58;
  const rayT = 2;
  const rayL = size * 0.12;
  const stroke = Math.max(1.5, size * 0.065);
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View style={[g.rayV, { width: rayT, height: rayL, backgroundColor: color, top: size * 0.04, left: size / 2 - rayT / 2 }]} />
      <View
        style={[
          g.rayV,
          {
            width: rayT,
            height: rayL,
            backgroundColor: color,
            bottom: size * 0.04,
            left: size / 2 - rayT / 2,
          },
        ]}
      />
      <View style={[g.rayH, { height: rayT, width: rayL, backgroundColor: color, left: size * 0.04, top: size / 2 - rayT / 2 }]} />
      <View
        style={[
          g.rayH,
          {
            height: rayT,
            width: rayL,
            backgroundColor: color,
            right: size * 0.04,
            top: size / 2 - rayT / 2,
          },
        ]}
      />
      <View
        style={[
          g.disk,
          {
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: stroke,
            borderColor: color,
            left: size / 2 - d / 2,
            top: size / 2 - d / 2,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={{ position: 'absolute', left: 0, top: 0, width: d / 2, height: d, backgroundColor: color, opacity: 0.4 }} />
      </View>
      <View
        style={{
          position: 'absolute',
          width: size * 0.12,
          height: size * 0.12,
          borderRadius: size * 0.06,
          borderWidth: stroke * 0.7,
          borderColor: color,
          left: size / 2 - size * 0.06,
          top: size / 2 - size * 0.06,
        }}
      />
    </View>
  );
}

function ContrastGlyph({ color, size }: { color: string; size: number }) {
  const d = size * 0.62;
  const stroke = Math.max(1.5, size * 0.07);
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={[
          g.disk,
          {
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: stroke,
            borderColor: color,
            left: size / 2 - d / 2,
            top: size / 2 - d / 2,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={{ width: d / 2, height: d, backgroundColor: color }} />
      </View>
    </View>
  );
}

function WarmthGlyph({ color, size }: { color: string; size: number }) {
  const tubeW = size * 0.15;
  const tubeH = size * 0.5;
  const bulb = size * 0.2;
  const stroke = Math.max(1.5, size * 0.06);
  const lineW = size * 0.22;
  const lineH = Math.max(1.5, size * 0.05);
  const gap = size * 0.065;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.16,
          top: size * 0.12,
          width: tubeW,
          height: tubeH,
          borderRadius: tubeW / 2,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.14,
          top: size * 0.12 + tubeH - bulb * 0.35,
          width: bulb,
          height: bulb,
          borderRadius: bulb / 2,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            right: size * 0.1,
            top: size / 2 - lineH / 2 + (i - 1) * (lineH + gap),
            width: lineW,
            height: lineH,
            borderRadius: lineH / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

function PopGlyph({ color, size }: { color: string; size: number }) {
  const stroke = Math.max(1.5, size * 0.07);
  const d = size * 0.38;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.18,
          left: size / 2 - d / 2,
          width: 0,
          height: 0,
          borderLeftWidth: d * 0.45,
          borderRightWidth: d * 0.45,
          borderBottomWidth: d * 0.75,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.14,
          left: size / 2 - d / 2,
          width: d,
          height: d,
          borderRadius: d / 2,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
    </View>
  );
}

function SkinGlyph({ color, size }: { color: string; size: number }) {
  const head = size * 0.42;
  const stroke = Math.max(1.5, size * 0.06);
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.14,
          left: size / 2 - head / 2,
          width: head,
          height: head,
          borderRadius: head / 2,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.2,
          left: size * 0.28,
          width: size * 0.44,
          height: size * 0.14,
          borderBottomWidth: stroke,
          borderColor: color,
          borderBottomLeftRadius: size * 0.1,
          borderBottomRightRadius: size * 0.1,
        }}
      />
    </View>
  );
}

function SkyGlyph({ color, size }: { color: string; size: number }) {
  const stroke = Math.max(1.5, size * 0.055);
  const arcW = size * 0.62;
  const arcH = size * 0.28;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.16,
          left: size / 2 - arcW / 2,
          width: arcW,
          height: arcH,
          borderTopLeftRadius: arcH,
          borderTopRightRadius: arcH,
          borderWidth: stroke,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.34,
          left: size * 0.12,
          right: size * 0.12,
          height: stroke,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          right: size * 0.2,
          width: size * 0.1,
          height: size * 0.1,
          borderRadius: size * 0.05,
          borderWidth: stroke * 0.8,
          borderColor: color,
        }}
      />
    </View>
  );
}

function GreenGlyph({ color, size }: { color: string; size: number }) {
  const stroke = Math.max(1.5, size * 0.06);
  const w = size * 0.36;
  const h = size * 0.52;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          left: size / 2 - w / 2,
          top: size * 0.18,
          width: w,
          height: h,
          borderTopLeftRadius: w,
          borderTopRightRadius: w,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          borderWidth: stroke,
          borderColor: color,
          transform: [{ rotate: '-18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: stroke * 2.2,
          height: size * 0.22,
          backgroundColor: color,
          left: size * 0.42,
          top: size * 0.36,
          transform: [{ rotate: '35deg' }],
          borderRadius: 1,
        }}
      />
    </View>
  );
}

function WarmSelectGlyph({ color, size }: { color: string; size: number }) {
  const ray = size * 0.08;
  const t = Math.max(1.5, size * 0.045);
  const sun = size * 0.16;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.12,
          left: size * 0.14,
          width: sun,
          height: sun,
          borderRadius: sun / 2,
          borderWidth: t * 1.2,
          borderColor: color,
        }}
      />
      <View style={[g.rayH, { width: ray, height: t, backgroundColor: color, top: size * 0.14, left: size * 0.05 }]} />
      <View style={[g.rayH, { width: ray, height: t, backgroundColor: color, top: size * 0.2, left: size * 0.04 }]} />
      <View style={[g.rayH, { width: t, height: ray, backgroundColor: color, top: size * 0.1, left: size * 0.2 }]} />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.2,
          left: size * 0.18,
          right: size * 0.12,
          height: size * 0.12,
          borderBottomWidth: t,
          borderColor: color,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
        }}
      />
    </View>
  );
}

function SharpnessGlyph({ color, size }: { color: string; size: number }) {
  const t = Math.max(2, size * 0.07);
  const w = size * 0.5;
  const h = size * 0.38;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.22,
          left: size / 2 - w / 2,
          width: 0,
          height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderBottomWidth: h,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.2,
          left: size / 2 - t / 2,
          width: t,
          height: h * 0.35,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

function GrainGlyph({ color, size }: { color: string; size: number }) {
  const d = Math.max(2, size * 0.09);
  const gap = size * 0.2;
  const start = size * 0.16;
  const positions = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ({ top: start + row * gap, left: start + col * gap })));
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      {positions.map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: color,
            opacity: i % 3 === 0 ? 1 : i % 3 === 1 ? 0.75 : 0.5,
            top: p.top,
            left: p.left,
          }}
        />
      ))}
    </View>
  );
}

function FadeGlyph({ color, size }: { color: string; size: number }) {
  const w = size * 0.22;
  const h = size * 0.52;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.22,
          top: size * 0.2,
          width: w,
          height: h,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.48,
          top: size * 0.2,
          width: w,
          height: h,
          borderRadius: 3,
          backgroundColor: color,
          opacity: 0.45,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.14,
          top: size * 0.2,
          width: w,
          height: h,
          borderRadius: 3,
          backgroundColor: color,
          opacity: 0.2,
        }}
      />
    </View>
  );
}

function VignetteGlyph({ color, size }: { color: string; size: number }) {
  const t = Math.max(1.5, size * 0.065);
  const L = size * 0.2;
  const inset = size * 0.1;
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View style={{ position: 'absolute', top: inset, left: inset, width: L, height: t, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: inset, left: inset, width: t, height: L, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: inset, right: inset, width: L, height: t, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: inset, right: inset, width: t, height: L, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: inset, left: inset, width: L, height: t, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: inset, left: inset, width: t, height: L, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: inset, right: inset, width: L, height: t, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: inset, right: inset, width: t, height: L, backgroundColor: color }} />
    </View>
  );
}

function SaturationGlyph({ color, size }: { color: string; size: number }) {
  const stemW = Math.max(2, size * 0.065);
  const stemLen = size * 0.48;
  const bulb = size * 0.17;
  const stroke = Math.max(1.5, size * 0.06);
  return (
    <View style={[g.wrap, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          width: stemW,
          height: stemLen,
          backgroundColor: color,
          borderRadius: stemW / 2,
          left: size * 0.36,
          top: size * 0.2,
          transform: [{ rotate: '-34deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: bulb,
          height: bulb,
          borderRadius: bulb / 2,
          borderWidth: stroke,
          borderColor: color,
          right: size * 0.1,
          top: size * 0.12,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.14,
          height: size * 0.065,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          backgroundColor: color,
          left: size * 0.18,
          bottom: size * 0.24,
          transform: [{ rotate: '-34deg' }],
        }}
      />
    </View>
  );
}

const g = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  rayV: { position: 'absolute' },
  rayH: { position: 'absolute' },
  disk: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  col: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bar: {
    height: 2,
    borderRadius: 1,
  },
});
