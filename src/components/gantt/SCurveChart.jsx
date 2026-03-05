import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useSCurve } from '../../hooks/useSCurve';

const PLAN_COLOR   = '#829ab1';
const ACTUAL_COLOR = '#3b82f6';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const plan   = payload.find((p) => p.dataKey === 'plan');
  const actual = payload.find((p) => p.dataKey === 'actual');
  const variance = plan && actual ? (actual.value - plan.value).toFixed(1) : null;
  return (
    <div className="bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-industrial-200 mb-1">{label}</p>
      {plan   && <p style={{ color: PLAN_COLOR }}>แผน: <span className="font-mono font-bold">{plan.value?.toFixed(1)}%</span></p>}
      {actual && <p style={{ color: ACTUAL_COLOR }}>จริง: <span className="font-mono font-bold">{actual.value?.toFixed(1)}%</span></p>}
      {variance !== null && (
        <p className={`mt-1 font-semibold ${parseFloat(variance) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {parseFloat(variance) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(variance))}%
        </p>
      )}
    </div>
  );
}

export default function SCurveChart({ activities, scale, projectName }) {
  const { data, todayLabel } = useSCurve(activities, scale);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-industrial-500 text-xs">
        ไม่มีข้อมูลเพียงพอสำหรับ S-Curve
      </div>
    );
  }

  // Thin the x-axis ticks for readability based on data length
  const tickInterval = data.length > 24 ? Math.floor(data.length / 12) - 1
    : data.length > 12 ? 1 : 0;

  return (
    <div className="scurve-section">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 no-print">
        <TrendingUp size={14} className="text-accent-400" />
        <span className="text-xs font-semibold text-industrial-300 uppercase tracking-wider">
          S-Curve — ความก้าวหน้าสะสม (Cumulative Progress)
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={PLAN_COLOR} stopOpacity={0.15} />
              <stop offset="95%" stopColor={PLAN_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={ACTUAL_COLOR} stopOpacity={0.2} />
              <stop offset="95%" stopColor={ACTUAL_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(130,154,177,0.12)"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            tick={{ fill: '#627d98', fontSize: 9, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#334e68' }}
            tickLine={false}
            interval={tickInterval}
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: '#627d98', fontSize: 9, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
            formatter={(value) => (
              <span style={{ color: '#9fb3c8', fontSize: 10 }}>
                {value === 'plan' ? 'แผน (Plan)' : 'จริง (Actual)'}
              </span>
            )}
          />

          {/* Today reference line */}
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke="#f6ad55"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{
                value: 'วันนี้',
                position: 'insideTopRight',
                fill: '#f6ad55',
                fontSize: 9,
              }}
            />
          )}

          {/* Plan area + line */}
          <Area
            type="monotone"
            dataKey="plan"
            stroke={PLAN_COLOR}
            strokeWidth={2}
            fill="url(#planGrad)"
            dot={false}
            activeDot={{ r: 3, fill: PLAN_COLOR }}
            connectNulls
          />

          {/* Actual area + line */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke={ACTUAL_COLOR}
            strokeWidth={2.5}
            fill="url(#actualGrad)"
            dot={false}
            activeDot={{ r: 4, fill: ACTUAL_COLOR }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
