import Svg, { Defs, LinearGradient, Path, Polyline, Stop } from 'react-native-svg';

/** Ported from the prototype's sparkPath(): 100×34 viewBox, 2px top/4px bottom inset. */
function sparkPoints(arr: number[]): [number, number][] {
  const w = 100;
  const h = 34;
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const span = max - min || 1;
  return arr.map((v, i) => [(i / (arr.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 6)]);
}

interface Props {
  data: number[];
  accent: string;
  height?: number;
}

/** Net P&L sparkline — gradient area fill (accent 0.16→0) + 2px accent polyline. */
export function Sparkline({ data, accent, height = 64 }: Props) {
  if (!data.length) return null;
  const pts = sparkPoints(data);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `M0,34 L${line.split(' ').join(' L')} L100,34 Z`;
  return (
    <Svg viewBox="0 0 100 34" preserveAspectRatio="none" width="100%" height={height} style={{ marginTop: 18 }}>
      <Defs>
        <LinearGradient id="claroSpark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity={0.16} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#claroSpark)" />
      <Polyline
        points={line}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
}
