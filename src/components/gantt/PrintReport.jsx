import { format, parseISO, isValid, min, max, addDays,
  differenceInCalendarDays, startOfMonth, endOfMonth,
  eachMonthOfInterval, startOfYear, endOfYear, eachYearOfInterval,
  startOfWeek, endOfWeek, eachWeekOfInterval,
} from 'date-fns';
import { th } from 'date-fns/locale';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Legend, ReferenceLine,
} from 'recharts';
import { useSCurve } from '../../hooks/useSCurve';

// ── Paper → usable pixel width ────────────────────────────────────────────
// margins = 12 mm each side (10mm top/bottom, 12mm left/right). At 96 dpi: px = (mm / 25.4) * 96
const PRINT_WIDTHS = {
  'A4-landscape': Math.round((297 - 24) / 25.4 * 96), // ~1034
  'A4-portrait':  Math.round((210 - 24) / 25.4 * 96), // ~704
  'A3-landscape': Math.round((420 - 24) / 25.4 * 96), // ~1500
  'A3-portrait':  Math.round((297 - 24) / 25.4 * 96), // ~1034
};

// ── Pure timeline builder (mirrors useGanttTimeline without the hook) ─────
function buildTimeline(activities, scale = 'months') {
  function safeP(s) { if (!s) return null; const d = parseISO(s); return isValid(d) ? d : null; }

  const allDates = activities.flatMap((a) =>
    [a.planStart, a.planFinish, a.actualStart, a.actualFinish].map(safeP).filter(Boolean)
  );
  if (!allDates.length) return null;

  const dataMin = min(allDates);
  const dataMax = max(allDates);
  const pad = scale === 'years' ? 90 : scale === 'months' ? 28 : 14;
  const rawStart = addDays(dataMin, -pad);
  const rawEnd   = addDays(dataMax,  pad);

  let timelineStart, timelineEnd;
  if (scale === 'weeks') {
    timelineStart = startOfWeek(rawStart, { weekStartsOn: 1 });
    timelineEnd   = endOfWeek(rawEnd,     { weekStartsOn: 1 });
  } else if (scale === 'months') {
    timelineStart = startOfMonth(rawStart);
    timelineEnd   = endOfMonth(rawEnd);
  } else {
    timelineStart = startOfYear(rawStart);
    timelineEnd   = endOfYear(rawEnd);
  }

  let cols = [];
  const CW = scale === 'years' ? 80 : scale === 'months' ? 56 : 40;
  if (scale === 'weeks') {
    const weeks = eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 1 });
    cols = weeks.map((ws, i) => {
      const prev = i > 0 ? weeks[i - 1] : null;
      const showM = i === 0 || (prev && ws.getMonth() !== prev.getMonth());
      return { key: ws.toISOString(), label: `W${format(ws, 'w')}`, groupLabel: showM ? format(ws, 'MMM yyyy', { locale: th }) : null, width: CW };
    });
  } else if (scale === 'months') {
    const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
    cols = months.map((ms, i) => {
      const prev = i > 0 ? months[i - 1] : null;
      const showY = i === 0 || (prev && ms.getFullYear() !== prev.getFullYear());
      return { key: ms.toISOString(), label: format(ms, 'MMM', { locale: th }), groupLabel: showY ? format(ms, 'yyyy') : null, width: CW };
    });
  } else {
    const years = eachYearOfInterval({ start: timelineStart, end: timelineEnd });
    cols = years.map((ys) => ({ key: ys.toISOString(), label: format(ys, 'yyyy'), groupLabel: null, width: CW }));
  }

  const totalWidth = cols.length * CW;
  const totalDays  = differenceInCalendarDays(timelineEnd, timelineStart) + 1;
  const ppd        = totalWidth / totalDays;

  function dateToX(s) {
    const d = safeP(s); if (!d) return 0;
    return Math.max(0, differenceInCalendarDays(d, timelineStart) * ppd);
  }
  function spanW(s, e) {
    const sd = safeP(s), ed = safeP(e); if (!sd || !ed) return 0;
    return Math.max(2, (differenceInCalendarDays(ed, sd) + 1) * ppd);
  }
  return { cols, totalWidth, dateToX, spanW, ppd, CW };
}

function fmt(s) {
  if (!s) return '—';
  const d = parseISO(s);
  return isValid(d) ? format(d, 'd MMM yyyy', { locale: th }) : '—';
}

function progressColor(p) {
  if (p >= 100) return '#22c55e';
  if (p >= 60)  return '#3b82f6';
  if (p >= 30)  return '#ed8936';
  return '#ef4444';
}

// ── Row heights for the Gantt SVG ────────────────────────────────────────
const ROW_H    = 24;  // px per activity row (compact for print)
const HDR_H    = 32;  // header height (group row + label row)
const BAR_H    = 7;   // plan/actual bar height
const PLAN_Y   = 5;   // plan bar top offset within row
const ACTUAL_Y = 13;  // actual bar top offset within row

function progressFill(p) {
  if (p >= 100) return '#22c55e';
  if (p >= 60)  return '#3b82f6';
  if (p >= 30)  return '#ed8936';
  return '#ef4444';
}

/**
 * Hidden-until-print component.
 * content prop: 'gantt' | 'scurve' | 'both'  (default 'both')
 * size:        'A4' | 'A3'
 * orientation: 'landscape' | 'portrait'
 */
export default function PrintReport({
  project, activities, scale,
  content = 'both',
  size = 'A4',
  orientation = 'landscape',
}) {
  const { data: sCurveData, todayLabel } = useSCurve(activities, scale);
  const today = new Date();

  const totalPaperW = PRINT_WIDTHS[`${size}-${orientation}`] ?? 900;
  const showGantt  = content === 'gantt'  || content === 'both';
  const showSCurve = content === 'scurve' || content === 'both';

  // ── Build sorted activity list ──────────────────────────────────────────
  const roots    = activities.filter((a) => !a.parentId);
  const childMap = new Map();
  activities.filter((a) => a.parentId).forEach((c) => {
    if (!childMap.has(c.parentId)) childMap.set(c.parentId, []);
    childMap.get(c.parentId).push(c);
  });
  const sorted = [];
  roots.sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }))
    .forEach((r) => {
      sorted.push(r);
      (childMap.get(r.id) || [])
        .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }))
        .forEach((c) => sorted.push(c));
    });

  const overallProgress = roots.length
    ? Math.round(roots.reduce((s, a) => s + (a.weight / 100) * a.progress, 0))
    : 0;

  const contentLabel =
    content === 'gantt'  ? 'Gantt Chart' :
    content === 'scurve' ? 'S-Curve' :
                           'Gantt Chart & S-Curve';

  // ── Gantt SVG layout ────────────────────────────────────────────────────
  // Left pane = WBS info table (fixed 260px), right pane = timeline bars
  const TABLE_W  = 260;
  const ganttW   = totalPaperW - TABLE_W;  // width for the SVG timeline
  const timeline = buildTimeline(activities, scale);

  // viewBox uses native timeline width; SVG width attribute = ganttW (scales via viewBox)
  const svgNativeW = timeline ? timeline.totalWidth : ganttW;
  const svgH       = HDR_H + sorted.length * ROW_H;

  // S-Curve chart dimensions
  const sCurveW = totalPaperW;
  const sCurveH = content === 'scurve' ? 280 : 180;

  return (
    <div className="print-report">
      {/* ── Project Header ─────────────────────────────────────────────── */}
      <div className="print-header">
        <div className="print-header-left">
          <div className="print-logo">CMG</div>
          <div>
            <div className="print-title">{project?.name ?? 'โครงการ'}</div>
            <div className="print-subtitle">
              PM: {project?.projectManager ?? '—'} &nbsp;|&nbsp; CM: {project?.constructionManager ?? '—'} &nbsp;|&nbsp;
              สถานะ: {project?.status ?? '—'} &nbsp;|&nbsp;
              ความก้าวหน้ารวม: {overallProgress}% &nbsp;|&nbsp;
              รายงาน: {contentLabel}
            </div>
          </div>
        </div>
        <div className="print-header-right">
          <div className="print-date-label">วันที่พิมพ์</div>
          <div className="print-date">{format(today, 'd MMMM yyyy', { locale: th })}</div>
        </div>
      </div>

      {/* ── Gantt Section ──────────────────────────────────────────────── */}
      {showGantt && timeline && (
        <>
          <div className="print-section-title">
            ตารางแผนงาน (Work Breakdown Structure) &amp; Gantt Chart
          </div>

          {/* Split-pane: left=info table, right=SVG timeline */}
          <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #cbd5e0' }}>

            {/* ── Left: WBS info columns ── */}
            <div style={{ width: TABLE_W, flexShrink: 0, borderRight: '1px solid #cbd5e0', fontSize: 6.5 }}>
              {/* Header row */}
              <div style={{
                height: HDR_H, display: 'flex', alignItems: 'flex-end', paddingBottom: 2,
                backgroundColor: '#2d3748', color: 'white', fontWeight: 700,
              }}>
                <span style={{ width: 26, padding: '0 2px', textAlign: 'center', flexShrink: 0 }}>WBS</span>
                <span style={{ flex: 1, padding: '0 2px' }}>ชื่องาน</span>
                <span style={{ width: 28, padding: '0 2px', textAlign: 'center', flexShrink: 0 }}>น้ำหนัก</span>
                <span style={{ width: 40, padding: '0 2px', textAlign: 'center', flexShrink: 0 }}>แผนเริ่ม</span>
                <span style={{ width: 40, padding: '0 2px', textAlign: 'center', flexShrink: 0 }}>แผนเสร็จ</span>
                <span style={{ width: 26, padding: '0 2px', textAlign: 'center', flexShrink: 0 }}>%</span>
              </div>

              {/* Data rows */}
              {sorted.map((row) => {
                const isMain = !row.parentId;
                return (
                  <div key={row.id} style={{
                    height: ROW_H,
                    display: 'flex', alignItems: 'center',
                    backgroundColor: isMain ? '#edf2f7' : 'white',
                    borderBottom: '1px solid #e2e8f0',
                    fontWeight: isMain ? 700 : 400,
                  }}>
                    <span style={{ width: 26, padding: '0 2px', textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', color: '#4a5568', fontSize: 6 }}>{row.wbs}</span>
                    <span style={{ flex: 1, padding: '0 2px', overflow: 'hidden', whiteSpace: 'nowrap', paddingLeft: isMain ? 2 : 8 }} title={row.name}>{row.name}</span>
                    <span style={{ width: 28, padding: '0 2px', textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', color: '#4a5568' }}>{row.weight}%</span>
                    <span style={{ width: 40, padding: '0 2px', textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', color: '#4a5568', fontSize: 5.5 }}>{fmt(row.planStart)}</span>
                    <span style={{ width: 40, padding: '0 2px', textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', color: '#4a5568', fontSize: 5.5 }}>{fmt(row.planFinish)}</span>
                    <span style={{ width: 26, padding: '0 2px', textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', color: progressFill(row.progress), fontWeight: 700 }}>{row.progress}%</span>
                  </div>
                );
              })}
            </div>

            {/* ── Right: SVG Gantt bars ── */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <svg
                width={ganttW}
                height={svgH}
                viewBox={`0 0 ${svgNativeW} ${svgH}`}
                preserveAspectRatio="none"
                style={{ display: 'block' }}
              >
                {/* ── Column grid + header ── */}
                {(() => {
                  let x = 0;
                  const els = [];
                  // Group labels (years/months) — row 1 of header (top 18px)
                  let gx = 0;
                  let gLabel = null, gStart = 0;
                  const flushGroup = (endX) => {
                    if (gLabel) {
                      els.push(
                        <text key={`gl-${gStart}`} x={gStart + 2} y={11} fontSize={7} fill="#2d3748" fontWeight={700}>{gLabel}</text>
                      );
                    }
                  };
                  timeline.cols.forEach((col, i) => {
                    if (col.groupLabel && col.groupLabel !== gLabel) {
                      flushGroup(gx);
                      gLabel = col.groupLabel;
                      gStart = gx;
                    }
                    // vertical grid line
                    els.push(<line key={`vg-${i}`} x1={gx} y1={HDR_H} x2={gx} y2={svgH} stroke="#e2e8f0" strokeWidth={0.5} />);
                    // col label row 2 (months/weeks)
                    els.push(
                      <text key={`cl-${i}`} x={gx + col.width / 2} y={HDR_H - 4} fontSize={6} fill="#4a5568" textAnchor="middle">{col.label}</text>
                    );
                    gx += col.width;
                  });
                  flushGroup(gx);
                  // Header background
                  els.unshift(
                    <rect key="hdr-bg" x={0} y={0} width={svgNativeW} height={HDR_H} fill="#2d3748" />,
                    <line key="hdr-sep" x1={0} y1={HDR_H - 18} x2={svgNativeW} y2={HDR_H - 18} stroke="#4a5568" strokeWidth={0.5} />
                  );
                  return els;
                })()}

                {/* ── Today line ── */}
                {(() => {
                  const todayStr = format(today, 'yyyy-MM-dd');
                  const tx = timeline.dateToX(todayStr);
                  if (tx <= 0 || tx >= svgNativeW) return null;
                  return <line key="today" x1={tx} y1={HDR_H} x2={tx} y2={svgH} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" />;
                })()}

                {/* ── Activity bars ── */}
                {sorted.map((row, ri) => {
                  const y0 = HDR_H + ri * ROW_H;
                  const els = [];

                  // Alternating row background
                  if (ri % 2 === 0) {
                    els.push(<rect key={`rb-${row.id}`} x={0} y={y0} width={svgNativeW} height={ROW_H} fill="#f7fafc" />);
                  }

                  // Plan bar
                  if (row.planStart && row.planFinish) {
                    const px = timeline.dateToX(row.planStart);
                    const pw = timeline.spanW(row.planStart, row.planFinish);
                    els.push(
                      <rect key={`plan-${row.id}`} x={px} y={y0 + PLAN_Y} width={pw} height={BAR_H}
                        fill={row.parentId ? '#a0aec0' : '#718096'} rx={1} opacity={0.85} />
                    );
                    // Plan label
                    if (pw > 24) {
                      els.push(
                        <text key={`pl-${row.id}`} x={px + pw / 2} y={y0 + PLAN_Y + BAR_H - 1.5}
                          fontSize={5.5} fill="white" textAnchor="middle">{row.progress}%</text>
                      );
                    }
                  }

                  // Actual bar
                  if (row.actualStart) {
                    const ax = timeline.dateToX(row.actualStart);
                    const aw = row.actualFinish
                      ? timeline.spanW(row.actualStart, row.actualFinish)
                      : Math.max(4, timeline.dateToX(format(today, 'yyyy-MM-dd')) - ax);
                    const fillW = Math.max(0, Math.min(aw, (row.progress / 100) * aw));
                    const barColor = row.progress >= 100 ? '#16a34a' : row.actualFinish && row.actualFinish > row.planFinish ? '#dc2626' : '#2563eb';
                    const fillColor = row.progress >= 100 ? '#4ade80' : '#60a5fa';

                    if (aw > 0) {
                      // Outer bar
                      els.push(<rect key={`act-${row.id}`} x={ax} y={y0 + ACTUAL_Y} width={aw} height={BAR_H} fill={barColor} rx={1} />);
                      // Fill
                      if (fillW > 0) {
                        els.push(<rect key={`fill-${row.id}`} x={ax} y={y0 + ACTUAL_Y} width={fillW} height={BAR_H} fill={fillColor} rx={1} opacity={0.9} />);
                      }
                      // Label
                      if (aw > 20) {
                        els.push(
                          <text key={`al-${row.id}`} x={ax + aw / 2} y={y0 + ACTUAL_Y + BAR_H - 1.5}
                            fontSize={5.5} fill="white" fontWeight={700} textAnchor="middle">{row.progress}%</text>
                        );
                      }
                    }
                  }

                  // Row bottom border
                  els.push(<line key={`rl-${row.id}`} x1={0} y1={y0 + ROW_H} x2={svgNativeW} y2={y0 + ROW_H} stroke="#e2e8f0" strokeWidth={0.4} />);

                  return els;
                })}
              </svg>
            </div>
          </div>

          {/* Legend - Symbols and Meanings */}
          <div style={{ marginTop: 6, padding: '6px 8px', backgroundColor: '#f7fafc', border: '1px solid #cbd5e0', borderRadius: 3 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#2d3748', marginBottom: 4 }}>
              สัญลักษณ์และความหมาย (Symbols & Meanings)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 12px', fontSize: 6.5, color: '#4a5568' }}>
              {/* Row 1 */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 16, height: 6, background: '#718096', borderRadius: 1, border: '0.5px solid #4a5568' }} />
                <span>แผนงาน (Baseline Plan)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 16, height: 6, background: '#2563eb', borderRadius: 1 }} />
                <span>ผลงานจริง สีน้ำเงิน (Actual - In Progress)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 16, height: 6, background: '#16a34a', borderRadius: 1 }} />
                <span>ผลงานจริง สีเขียว (Actual - Completed 100%)</span>
              </span>
              
              {/* Row 2 */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 16, height: 6, background: '#dc2626', borderRadius: 1 }} />
                <span>ผลงานจริง สีแดง (Actual - Delayed/Late)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 1.5, height: 12, background: '#f59e0b' }} />
                <span>เส้นสีส้ม (Today's Date)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 16, height: 1, background: '#cbd5e0' }} />
                <span>เส้นแบ่งแถว (Row Separator)</span>
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── S-Curve ────────────────────────────────────────────────────── */}
      {showSCurve && sCurveData.length > 0 && (
        <>
          <div className="print-section-title" style={{ marginTop: showGantt ? 10 : 0 }}>
            S-Curve — ความก้าวหน้าสะสม (Cumulative Progress %)
          </div>
          <div style={{ width: sCurveW, height: sCurveH, overflow: 'hidden' }}>
            <ComposedChart
              width={sCurveW}
              height={sCurveH}
              data={sCurveData}
              margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: content === 'scurve' ? 9 : 8, fill: '#4a5568' }} interval="preserveStartEnd" stroke="#a0aec0" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: content === 'scurve' ? 9 : 8, fill: '#4a5568' }} width={36} stroke="#a0aec0" />
              <Legend wrapperStyle={{ fontSize: content === 'scurve' ? 10 : 9, color: '#2d3748' }} />
              {todayLabel && (
                <ReferenceLine x={todayLabel} stroke="#d69e2e" strokeDasharray="4 3"
                  label={{ value: 'วันนี้', fontSize: 8, fill: '#d69e2e', position: 'top' }} />
              )}
              <Area type="monotone" dataKey="plan"   stroke="#829ab1" strokeWidth={1.5} fill="#e2e8f0" dot={false} name="แผน (Plan)"   connectNulls />
              <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2}   fill="#bfdbfe" dot={false} name="จริง (Actual)" connectNulls />
            </ComposedChart>
          </div>
        </>
      )}

      {/* ── Signature Block ─────────────────────────────────────────────── */}
      <div className="print-signature-block">
        <SignBox label="ผู้จัดทำรายงาน" />
        <SignBox label="ผู้ตรวจสอบ" />
        <SignBox label={`Project Manager\n${project?.projectManager ?? ''}`} />
      </div>
    </div>
  );
}

function SignBox({ label }) {
  return (
    <div className="print-sign-box">
      <div className="print-sign-line" />
      <div className="print-sign-label" style={{ whiteSpace: 'pre-line' }}>{label}</div>
    </div>
  );
}
