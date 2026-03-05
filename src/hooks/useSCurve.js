import { useMemo } from 'react';
import {
  parseISO, isValid, addDays, differenceInCalendarDays,
  format, min, max, endOfMonth, eachMonthOfInterval,
  endOfWeek, eachWeekOfInterval,
} from 'date-fns';
import { th } from 'date-fns/locale';

function safeISO(s) {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

/**
 * Computes S-Curve data points for recharts.
 *
 * Only LEAF activities (no children) contribute — parents are roll-ups.
 * Weight is distributed linearly across each day of the planned/actual span.
 * Returns bucketed data (monthly or weekly) with cumulative Plan% and Actual%.
 */
export function useSCurve(activities, scale = 'months') {
  return useMemo(() => {
    const empty = { data: [], totalWeight: 0, todayLabel: null };
    if (!activities || activities.length === 0) return empty;

    // Identify parent ids so we can exclude them
    const parentIds = new Set(
      activities.filter((a) => a.parentId).map((a) => a.parentId)
    );
    const leaves = activities.filter((a) => !parentIds.has(a.id));
    if (leaves.length === 0) return empty;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Collect all relevant dates for timeline bounds
    const allDates = activities.flatMap((a) =>
      [a.planStart, a.planFinish, a.actualStart, a.actualFinish]
        .map(safeISO)
        .filter(Boolean)
    );
    allDates.push(today);
    if (allDates.length === 0) return empty;

    const tlStart = min(allDates);
    const tlEnd   = max(allDates);
    const totalDays = differenceInCalendarDays(tlEnd, tlStart) + 1;

    // Float64 daily increment arrays
    const planDay   = new Float64Array(totalDays);
    const actualDay = new Float64Array(totalDays);

    const totalWeight = leaves.reduce((s, a) => s + (Number(a.weight) || 0), 0);
    if (totalWeight === 0) return empty;

    leaves.forEach((a) => {
      const w = Number(a.weight) || 0;
      if (w === 0) return;

      // Plan spread
      const pS = safeISO(a.planStart);
      const pF = safeISO(a.planFinish);
      if (pS && pF && pF >= pS) {
        const span = differenceInCalendarDays(pF, pS) + 1;
        const inc  = w / span;
        for (let i = 0; i < span; i++) {
          const idx = differenceInCalendarDays(addDays(pS, i), tlStart);
          if (idx >= 0 && idx < totalDays) planDay[idx] += inc;
        }
      }

      // Actual spread — earned value = weight × (progress/100)
      const aS = safeISO(a.actualStart);
      if (aS) {
        const earned = w * ((Number(a.progress) || 0) / 100);
        if (earned === 0) return;
        const rawEnd = safeISO(a.actualFinish) ?? today;
        const aF     = rawEnd > today ? today : rawEnd;
        if (aF < aS) return;
        const span = differenceInCalendarDays(aF, aS) + 1;
        const inc  = earned / span;
        for (let i = 0; i < span; i++) {
          const idx = differenceInCalendarDays(addDays(aS, i), tlStart);
          if (idx >= 0 && idx < totalDays) actualDay[idx] += inc;
        }
      }
    });

    // Build cumulative daily array
    let cumPlan = 0, cumActual = 0;
    const daily = [];
    for (let i = 0; i < totalDays; i++) {
      cumPlan   += planDay[i];
      cumActual += actualDay[i];
      daily.push({
        date:   addDays(tlStart, i),
        plan:   cumPlan,
        actual: cumActual,
      });
    }

    // Bucket by scale into chart-ready data points
    let buckets = [];

    if (scale === 'weeks') {
      const weeks = eachWeekOfInterval(
        { start: tlStart, end: tlEnd },
        { weekStartsOn: 1 }
      );
      weeks.forEach((wStart) => {
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
        const snap = daily.filter((d) => d.date <= wEnd).at(-1);
        if (!snap) return;
        buckets.push({
          label:   format(wStart, "'W'w MMM", { locale: th }),
          rawDate: wStart,
          plan:    +Math.min(100, (snap.plan   / totalWeight) * 100).toFixed(2),
          actual:  +Math.min(100, (snap.actual / totalWeight) * 100).toFixed(2),
        });
      });
    } else {
      // months (and years scale also bucketed monthly for density)
      const months = eachMonthOfInterval({ start: tlStart, end: tlEnd });
      months.forEach((mStart) => {
        const mEnd = endOfMonth(mStart);
        const snap = daily.filter((d) => d.date <= mEnd).at(-1);
        if (!snap) return;
        buckets.push({
          label:   format(mStart, 'MMM yy', { locale: th }),
          rawDate: mStart,
          plan:    +Math.min(100, (snap.plan   / totalWeight) * 100).toFixed(2),
          actual:  +Math.min(100, (snap.actual / totalWeight) * 100).toFixed(2),
        });
      });
    }

    // Find today label for the reference line
    const todayLabel = buckets.find(
      (b) =>
        b.rawDate.getFullYear() === today.getFullYear() &&
        b.rawDate.getMonth()    === today.getMonth()
    )?.label ?? null;

    return { data: buckets, totalWeight, todayLabel };
  }, [activities, scale]);
}
