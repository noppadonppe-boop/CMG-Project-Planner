import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import GanttBar from './GanttBar';

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 56; // must match GanttTable sticky header height

/**
 * Right pane: sticky double-row header + one row per activity.
 * The outer scroll container is managed by the parent (GanttView).
 */
export default function GanttTimeline({
  columns, totalWidth, rows, ROW_H = ROW_HEIGHT, scale,
  dateToX, spanToWidth, pxPerDay, onUpdate, onEdit,
}) {
  const today = new Date();

  // Position of today line
  const todayColIdx = columns.findIndex(
    (col) => today >= col.start && today <= col.end
  );

  return (
    <div style={{ width: totalWidth, minWidth: totalWidth, position: 'relative' }}>

      {/* ─── Sticky Header ─────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 bg-industrial-800 border-b border-industrial-600"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Top row: month/year labels spanning multiple columns */}
        <TopHeaderRow columns={columns} scale={scale} />

        {/* Bottom row: individual column labels (W1, Jan, 2025…) */}
        <BottomHeaderRow columns={columns} scale={scale} today={today} />
      </div>

      {/* ─── Grid Body ─────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Vertical column separators + alternating bg */}
        {columns.map((col, i) => (
          <div
            key={col.key}
            className="absolute top-0 bottom-0 border-r border-industrial-700/40"
            style={{
              left: i * col.width,
              width: col.width,
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
            }}
          />
        ))}

        {/* Today vertical line */}
        {todayColIdx >= 0 && (
          <TodayLine columns={columns} todayColIdx={todayColIdx} today={today} rows={rows} ROW_H={ROW_H} />
        )}

        {/* Activity rows with Plan + Actual bars */}
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`relative border-b border-industrial-700/40 ${
              idx % 2 === 0 ? '' : 'bg-white/[0.012]'
            }`}
            style={{ height: ROW_H, width: totalWidth }}
          >
            <GanttBar
              row={row}
              dateToX={dateToX}
              spanToWidth={spanToWidth}
              pxPerDay={pxPerDay}
              onUpdate={onUpdate}
              onEdit={onEdit}
              totalWidth={totalWidth}
              ROW_H={ROW_H}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Top header row: groups columns by month/year label ────────────────── */
function TopHeaderRow({ columns, scale }) {
  // Group consecutive columns that share the same top-level label
  const groups = [];
  columns.forEach((col) => {
    if (col.monthLabel) {
      groups.push({ label: col.monthLabel, count: 1 });
    } else if (groups.length > 0) {
      groups[groups.length - 1].count += 1;
    } else {
      groups.push({ label: '', count: 1 });
    }
  });

  // For years scale there's no secondary grouping, hide top row
  if (scale === 'years') {
    return <div style={{ height: 24 }} />;
  }

  return (
    <div className="flex" style={{ height: 24 }}>
      {groups.map((g, i) => (
        <div
          key={i}
          className="shrink-0 flex items-center px-2 text-[10px] font-semibold text-industrial-300
                     border-r border-industrial-600/60 bg-industrial-800/90 overflow-hidden"
          style={{ width: g.count * columns[0]?.width ?? 40 }}
        >
          {g.label}
        </div>
      ))}
    </div>
  );
}

/* ── Bottom header row: individual column labels ────────────────────────── */
function BottomHeaderRow({ columns, scale, today }) {
  return (
    <div className="flex" style={{ height: 32 }}>
      {columns.map((col) => {
        const isCurrentCol = today >= col.start && today <= col.end;
        return (
          <div
            key={col.key}
            className={`shrink-0 flex items-center justify-center border-r border-industrial-700/50 last:border-r-0
              text-[10px] font-mono transition-colors
              ${isCurrentCol
                ? 'bg-accent-600/30 text-accent-300 font-bold'
                : 'text-industrial-400 hover:bg-industrial-700/30'}`}
            style={{ width: col.width }}
          >
            {col.label}
          </div>
        );
      })}
    </div>
  );
}

/* ── Today vertical line ────────────────────────────────────────────────── */
function TodayLine({ columns, todayColIdx, today, rows, ROW_H }) {
  const col = columns[todayColIdx];
  // Interpolate within the column
  const colDays = Math.max(1, (col.end - col.start) / 86400000 + 1);
  const dayInCol = (today - col.start) / 86400000;
  const fracX = todayColIdx * col.width + (dayInCol / colDays) * col.width;
  const totalHeight = rows.length * ROW_H;

  return (
    <div
      className="absolute top-0 z-10 pointer-events-none"
      style={{ left: fracX, width: 2, height: totalHeight }}
    >
      <div className="w-full h-full bg-accent-500/70" />
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-accent-400
                   bg-industrial-900 px-1 rounded border border-accent-600 whitespace-nowrap"
      >
        วันนี้
      </div>
    </div>
  );
}
