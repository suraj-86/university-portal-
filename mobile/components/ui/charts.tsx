import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Text } from '@/components/AppText';
import Svg, { Line, Rect, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/context/ThemeContext';

const H = 132;

function T({ children, style }: { v?: string; children?: React.ReactNode; style?: any }) {
  const { c } = useAppTheme();
  return <Text style={[{ fontSize: 12, color: c.muted, lineHeight: 17 }, style]}>{children}</Text>;
}
const PAD = { l: 34, r: 8, t: 10, b: 24 };

function useWidth() {
  const [w, setW] = useState(300);
  return { w, onLayout: (e: LayoutChangeEvent) => setW(Math.max(200, e.nativeEvent.layout.width)) };
}

const short = (s: string, n = 7) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function BarChart({ data, max = 100, mark, markLabel, partialLast, unit = '%' }: {
  data: { label: string; value: number }[]; max?: number; mark?: number; markLabel?: string; partialLast?: boolean; unit?: string;
}) {
  const { c } = useAppTheme();
  const { w, onLayout } = useWidth();
  if (!data.length) return null;
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const slot = iw / data.length;
  const bw = Math.min(34, slot * 0.6);
  const y = (v: number) => PAD.t + ih - (Math.min(v, max) / max) * ih;
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={H}>
        {[0, 0.5, 1].map((f) => (
          <React.Fragment key={f}>
            <Line x1={PAD.l} x2={w - PAD.r} y1={PAD.t + ih * (1 - f)} y2={PAD.t + ih * (1 - f)} stroke={c.border} strokeWidth={1} />
            <SvgText x={PAD.l - 6} y={PAD.t + ih * (1 - f) + 4} fontSize={10} fill={c.muted} textAnchor="end">{Math.round(max * f)}{unit}</SvgText>
          </React.Fragment>
        ))}
        {data.map((d, i) => {
          const x = PAD.l + slot * i + (slot - bw) / 2;
          const top = y(d.value);
          const fill = d.value < (mark ?? -1) ? c.warn : partialLast && i === data.length - 1 ? c.chartSoft : c.chart;
          return (
            <React.Fragment key={`${d.label}-${i}`}>
              <Rect x={x} y={top} width={bw} height={Math.max(1, PAD.t + ih - top)} rx={5} fill={fill} />
              <SvgText x={x + bw / 2} y={H - 8} fontSize={10} fill={c.muted} textAnchor="middle">{short(d.label)}</SvgText>
            </React.Fragment>
          );
        })}
        {mark !== undefined && <Line x1={PAD.l} x2={w - PAD.r} y1={y(mark)} y2={y(mark)} stroke={c.muted} strokeDasharray="5 4" strokeWidth={1.2} />}
      </Svg>
      {markLabel ? <T v="small">{markLabel}</T> : null}
    </View>
  );
}

export function LineChart({ labels, series, max = 100, mark }: {
  labels: string[]; series: { name: string; values: (number | null)[]; color?: string }[]; max?: number; mark?: number;
}) {
  const { c } = useAppTheme();
  const { w, onLayout } = useWidth();
  if (!labels.length) return null;
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const step = labels.length > 1 ? iw / (labels.length - 1) : 0;
  const x = (i: number) => PAD.l + (labels.length > 1 ? step * i : iw / 2);
  const y = (v: number) => PAD.t + ih - (Math.min(Math.max(v, 0), max) / max) * ih;
  const palette = [c.chart, c.danger, c.accent, c.warn, c.chartAlt];
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={H}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <React.Fragment key={f}>
            <Line x1={PAD.l} x2={w - PAD.r} y1={PAD.t + ih * (1 - f)} y2={PAD.t + ih * (1 - f)} stroke={c.border} strokeWidth={1} />
            <SvgText x={PAD.l - 6} y={PAD.t + ih * (1 - f) + 4} fontSize={10} fill={c.muted} textAnchor="end">{Math.round(max * f)}%</SvgText>
          </React.Fragment>
        ))}
        {mark !== undefined && <Line x1={PAD.l} x2={w - PAD.r} y1={y(mark)} y2={y(mark)} stroke={c.muted} strokeDasharray="5 4" strokeWidth={1.2} />}
        {labels.map((l, i) => (i % Math.ceil(labels.length / 5) === 0 ? <SvgText key={`${l}-${i}`} x={x(i)} y={H - 8} fontSize={10} fill={c.muted} textAnchor="middle">{short(l, 6)}</SvgText> : null))}
        {series.map((s, si) => {
          const color = s.color || palette[si % palette.length];
          const segs: string[][] = [[]];
          s.values.forEach((v, i) => { if (v === null || v === undefined) segs.push([]); else segs[segs.length - 1].push(`${x(i)},${y(v)}`); });
          return (
            <React.Fragment key={s.name}>
              {segs.filter((p) => p.length > 1).map((p, k) => <Polyline key={k} points={p.join(' ')} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />)}
              {s.values.map((v, i) => (v === null || v === undefined ? null : <Circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={c.surface} stroke={color} strokeWidth={2} />))}
            </React.Fragment>
          );
        })}
      </Svg>
      {series.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          {series.map((s, si) => (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color || palette[si % palette.length] }} />
              <Text style={{ color: c.muted, fontSize: 11 }}>{s.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Label, a bar, and the figure: easier to read than a column chart when subject names are long.
export function HBars({ rows, max = 100, mark, unit = '%' }: { rows: { label: string; value: number; note?: string }[]; max?: number; mark?: number; unit?: string }) {
  const { c } = useAppTheme();
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => {
        const low = mark !== undefined && r.value < mark;
        return (
          <View key={r.label} style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.label}</Text>
              <Text style={{ color: low ? c.warn : c.text, fontSize: 13, fontWeight: '700' }}>{r.value}{unit}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt }}>
              <View style={{ width: `${Math.max(0, Math.min(100, (r.value / max) * 100))}%`, height: 8, borderRadius: 4, backgroundColor: low ? c.warn : c.chart }} />
              {mark !== undefined && <View style={{ position: 'absolute', left: `${(mark / max) * 100}%`, top: -2, width: 2, height: 12, backgroundColor: c.muted }} />}
            </View>
            {r.note ? <T v="small">{r.note}</T> : null}
          </View>
        );
      })}
    </View>
  );
}

export function GroupedBars({ rows, names }: { rows: { label: string; a: number; b: number | null }[]; names: [string, string] }) {
  const { c } = useAppTheme();
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 4 }}>
          <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{r.label}</Text>
          {([[names[0], r.a, c.chart], [names[1], r.b, c.chartAlt]] as [string, number | null, string][]).map(([n, v, col]) => v === null ? null : (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt }}>
                <View style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: 8, borderRadius: 4, backgroundColor: col }} />
              </View>
              <Text style={{ width: 44, textAlign: 'right', color: c.muted, fontSize: 11, fontWeight: '700' }}>{v}%</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {[[names[0], c.chart], [names[1], c.chartAlt]].map(([n, col]) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col }} />
            <Text style={{ color: c.muted, fontSize: 11 }}>{n}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
