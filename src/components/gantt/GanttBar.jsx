import { useRef, useCallback } from 'react';
import { addDays, format, parseISO, isValid } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Renders Plan (top) + Actual (bottom) bar pair for one activity row.
 *
 * Drag behaviour:
 *  - Drag the Plan bar  → shifts planStart + planFinish by Δdays
 *  - Drag the Actual bar → shifts actualStart + actualFinish by Δdays
 *  - Right-resize handle → extends finish date
 *
 * All dates are ISO strings (YYYY-MM-DD). pxPerDay converts px ↔ days.
 */

const BAR_H = 10;           // height of each bar in px
const PLAN_TOP   = 11;      // vertical offset within the 52px row cell (11px top padding)
const ACTUAL_TOP = 32;      // 11 + 10 (plan bar) + 11 (gap) = 32px

function safeParseISO(s) {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}
function toISO(d) {
  return format(d, 'yyyy-MM-dd');
}
function fmtTip(s) {
  const d = safeParseISO(s);
  return d ? format(d, 'd MMM yyyy', { locale: th }) : '—';
}

export default function GanttBar({ row, dateToX, spanToWidth, pxPerDay, onUpdate, onEdit, totalWidth }) {
  const dragRef = useRef(null);

  /* ── Generic pointer-drag starter ──────────────────────────────────── */
  const startDrag = useCallback((e, type, field) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const origStart  = row[`${type}Start`];
    const origFinish = row[`${type}Finish`];

    function onMove(mv) {
      const dx   = mv.clientX - startX;
      const days = Math.round(dx / pxPerDay);
      if (days === 0) return;

      if (field === 'move') {
        const ns = safeParseISO(origStart);
        const nf = safeParseISO(origFinish);
        if (!ns || !nf) return;
        onUpdate(row.id, {
          [`${type}Start`]:  toISO(addDays(ns, days)),
          [`${type}Finish`]: toISO(addDays(nf, days)),
        });
      } else if (field === 'resizeEnd') {
        const nf = safeParseISO(origFinish);
        if (!nf) return;
        const clamped = addDays(nf, days);
        const ns = safeParseISO(origStart);
        if (ns && clamped < ns) return;
        onUpdate(row.id, { [`${type}Finish`]: toISO(clamped) });
      }
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dragRef.current = null;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dragRef.current = { type, field };
  }, [row, pxPerDay, onUpdate]);

  /* ── Compute bar geometry ──────────────────────────────────────────── */
  const planX  = dateToX(row.planStart);
  const planW  = spanToWidth(row.planStart, row.planFinish);
  const hasActualStart  = Boolean(row.actualStart);
  const hasActualFinish = Boolean(row.actualFinish);
  const actualX = hasActualStart ? dateToX(row.actualStart) : null;
  const actualW = hasActualStart && hasActualFinish
    ? spanToWidth(row.actualStart, row.actualFinish)
    : hasActualStart
      ? dateToX(new Date().toISOString().slice(0,10)) - dateToX(row.actualStart) + pxPerDay
      : 0;

  // Progress fill width (clamp between 0 and actualW)
  const fillW = Math.max(0, Math.min(actualW, (row.progress / 100) * actualW));

  // Determine if actual is late vs plan
  const isLate = row.actualFinish && row.planFinish && row.actualFinish > row.planFinish;
  const isOngoing = hasActualStart && !hasActualFinish;

  const actualBarColor = row.progress >= 100
    ? 'bg-green-600'
    : isLate
      ? 'bg-red-700'
      : isOngoing
        ? 'bg-blue-600'
        : 'bg-blue-700';

  const actualFillColor = row.progress >= 100
    ? 'bg-green-400'
    : isLate
      ? 'bg-red-400'
      : 'bg-blue-400';

  const canEdit = !row._hasChildren; // sub-activities are directly editable

  return (
    <div
      className="absolute inset-0"
      title={`${row.wbs} ${row.name}`}
    >
      {/* ── PLAN BAR ───────────────────────────────────────────────── */}
      {row.planStart && row.planFinish && (
        <div
          className="absolute rounded-sm bg-industrial-500/80 border border-industrial-400/50
                     hover:bg-industrial-400/80 transition-colors group/plan"
          style={{ left: planX, top: PLAN_TOP, width: Math.max(4, planW), height: BAR_H }}
          title={`แผน: ${fmtTip(row.planStart)} → ${fmtTip(row.planFinish)}`}
          onPointerDown={(e) => canEdit && startDrag(e, 'plan', 'move')}
        >
          {/* Plan label — show on wider bars */}
          {planW > 48 && (
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-industrial-200 pointer-events-none truncate px-1">
              {row.progress}%
            </span>
          )}
          {/* Resize handle (right edge) */}
          {canEdit && (
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group/plan-hover:opacity-100"
              onPointerDown={(e) => startDrag(e, 'plan', 'resizeEnd')}
            />
          )}
        </div>
      )}

      {/* ── ACTUAL BAR ─────────────────────────────────────────────── */}
      {hasActualStart && actualW > 0 && (
        <div
          className={`absolute rounded-sm border border-white/10 overflow-hidden
                      hover:brightness-110 transition-all group/actual ${actualBarColor}`}
          style={{ left: actualX, top: ACTUAL_TOP, width: Math.max(4, actualW), height: BAR_H }}
          title={`จริง: ${fmtTip(row.actualStart)} → ${row.actualFinish ? fmtTip(row.actualFinish) : 'กำลังดำเนินการ'} (${row.progress}%)`}
          onPointerDown={(e) => canEdit && startDrag(e, 'actual', 'move')}
        >
          {/* Progress fill */}
          <div
            className={`absolute left-0 top-0 bottom-0 rounded-l-sm ${actualFillColor} transition-all`}
            style={{ width: fillW }}
          />
          {/* Progress label */}
          {actualW > 32 && (
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white pointer-events-none z-10">
              {row.progress}%
            </span>
          )}
          {/* Ongoing pulse indicator */}
          {isOngoing && (
            <div className="absolute right-0 top-0 bottom-0 w-2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
          )}
          {/* Resize handle */}
          {canEdit && row.actualFinish && (
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
              onPointerDown={(e) => startDrag(e, 'actual', 'resizeEnd')}
            />
          )}
        </div>
      )}

      {/* ── CONNECTOR LINE (plan → actual, for late bars) ──────────── */}
      {row.planStart && hasActualStart && isLate && row.actualFinish && (
        <svg
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, width: totalWidth, height: 52, overflow: 'visible', zIndex: 0 }}
        >
          <line
            x1={planX + planW}
            y1={PLAN_TOP + BAR_H / 2}
            x2={actualX + actualW}
            y2={ACTUAL_TOP + BAR_H / 2}
            stroke="rgba(239,68,68,0.4)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        </svg>
      )}
    </div>
  );
}
