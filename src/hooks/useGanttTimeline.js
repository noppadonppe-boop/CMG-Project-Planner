import { useMemo } from 'react';
import {
  parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, eachWeekOfInterval, eachMonthOfInterval,
  eachYearOfInterval, addDays, differenceInCalendarDays,
  format, isValid, min, max,
} from 'date-fns';
import { th } from 'date-fns/locale';

export const CELL_WIDTH = { weeks: 40, months: 56, years: 80 }; // px per column

function safeParseISO(str) {
  if (!str) return null;
  const d = parseISO(str);
  return isValid(d) ? d : null;
}

/**
 * Builds timeline columns + helpers for a given scale & activity list.
 *
 * @param {Array}  activities  – filtered list for one project
 * @param {'weeks'|'months'|'years'} scale
 * @returns {{ columns, timelineStart, totalWidth, dateToX, spanToWidth, cellWidth }}
 */
export function useGanttTimeline(activities, scale = 'weeks') {
  return useMemo(() => {
    // ── Derive overall date range from BOTH plan AND actual dates ─────────
    const allDates = activities.flatMap((a) =>
      [a.planStart, a.planFinish, a.actualStart, a.actualFinish]
        .map(safeParseISO)
        .filter(Boolean)
    );

    if (allDates.length === 0) {
      return { columns: [], timelineStart: new Date(), totalWidth: 0, dateToX: () => 0, spanToWidth: () => 0, cellWidth: CELL_WIDTH[scale] };
    }

    const dataMin = min(allDates);
    const dataMax = max(allDates);

    // Pad only on the start side for breathing room; extend to latest finish date exactly
    const padStart = scale === 'years' ? 90 : scale === 'months' ? 28 : 14;
    const rawStart = addDays(dataMin, -padStart);
    const rawEnd   = dataMax;  // No padding on finish side — extend to latest finish (plan or actual)

    // Snap boundaries to scale unit
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

    // ── Generate column descriptors ───────────────────────────────────────
    let columns = [];
    const cw = CELL_WIDTH[scale];

    if (scale === 'weeks') {
      const weeks = eachWeekOfInterval(
        { start: timelineStart, end: timelineEnd },
        { weekStartsOn: 1 }
      );
      columns = weeks.map((weekStart, i) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const monthLabel = format(weekStart, 'MMM yyyy', { locale: th });
        // Show month label on first week of month or first column
        const prevWeek = i > 0 ? weeks[i - 1] : null;
        const showMonth = i === 0 || (prevWeek && weekStart.getMonth() !== prevWeek.getMonth());
        return {
          key: weekStart.toISOString(),
          start: weekStart,
          end: weekEnd,
          label: `W${format(weekStart, 'w')}`,
          monthLabel: showMonth ? monthLabel : null,
          width: cw,
        };
      });
    } else if (scale === 'months') {
      const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
      columns = months.map((monthStart, i) => {
        const monthEnd = endOfMonth(monthStart);
        const yearLabel = format(monthStart, 'yyyy');
        const prevMonth = i > 0 ? months[i - 1] : null;
        const showYear = i === 0 || (prevMonth && monthStart.getFullYear() !== prevMonth.getFullYear());
        return {
          key: monthStart.toISOString(),
          start: monthStart,
          end: monthEnd,
          label: format(monthStart, 'MMM', { locale: th }),
          monthLabel: showYear ? yearLabel : null,
          width: cw,
        };
      });
    } else {
      const years = eachYearOfInterval({ start: timelineStart, end: timelineEnd });
      columns = years.map((yearStart) => {
        const yearEnd = endOfYear(yearStart);
        return {
          key: yearStart.toISOString(),
          start: yearStart,
          end: yearEnd,
          label: format(yearStart, 'yyyy'),
          monthLabel: null,
          width: cw,
        };
      });
    }

    const totalWidth = columns.length * cw;

    // ── Coordinate helpers ────────────────────────────────────────────────
    const totalDays = differenceInCalendarDays(timelineEnd, timelineStart) + 1;
    const pxPerDay = totalWidth / totalDays;

    function dateToX(dateStr) {
      const d = safeParseISO(dateStr);
      if (!d) return 0;
      const days = differenceInCalendarDays(d, timelineStart);
      return Math.max(0, days * pxPerDay);
    }

    function spanToWidth(startStr, endStr) {
      const s = safeParseISO(startStr);
      const e = safeParseISO(endStr);
      if (!s || !e) return 0;
      const days = differenceInCalendarDays(e, s) + 1;
      return Math.max(2, days * pxPerDay);
    }

    return { columns, timelineStart, timelineEnd, totalWidth, dateToX, spanToWidth, cellWidth: cw, pxPerDay };
  }, [activities, scale]);
}
