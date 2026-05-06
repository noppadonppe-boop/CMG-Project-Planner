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

    // Use all activities that have weight (both main and children)
    // Each activity's progress contributes independently to S-Curve
    const weightedActivities = activities.filter((a) => Number(a.weight) > 0);
    if (weightedActivities.length === 0) return empty;

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
    const actualByDate = new Map(); // เก็บ earned value ตามวันที่รายงาน

    const totalWeight = weightedActivities.reduce((s, a) => s + (Number(a.weight) || 0), 0);
    if (totalWeight === 0) return empty;

    weightedActivities.forEach((a) => {
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

      // Actual — วิธีที่ 1: บันทึก earned value ทั้งหมดในวันที่รายงาน
      // รองรับทั้ง number และ string (เช่น "10" หรือ 10)
      const rawProgress = a.progress ?? a.actualProgress ?? 0;
      const progressVal = parseFloat(String(rawProgress).replace('%', '')) || 0;
      if (progressVal > 0) {
        const earned = w * (progressVal / 100);

        // หาวันที่รายงาน: ลำดับความสำคัญ actualFinish > actualStart > today
        let reportDate = safeISO(a.actualFinish);
        if (!reportDate || reportDate > today) {
          // ถ้าไม่มี actualFinish หรืออยู่ในอนาคต ใช้ actualStart (ถ้ามี) หรือ today
          const aStart = safeISO(a.actualStart);
          reportDate = aStart && aStart <= today ? aStart : today;
        }

        // ตรวจสอบว่าอยู่ใน timeline (ขยายขอบเขตให้รองรับ today ที่อาจนอกช่วงแผน)
        const extendedStart = min([tlStart, today]);
        const extendedEnd = max([tlEnd, today]);
        if (reportDate >= extendedStart && reportDate <= extendedEnd) {
          const dateKey = format(reportDate, 'yyyy-MM-dd');
          const current = actualByDate.get(dateKey) || 0;
          actualByDate.set(dateKey, current + earned);
        }
      }
    });

    // Build cumulative daily array
    let cumPlan = 0, cumActual = 0;
    const daily = [];
    for (let i = 0; i < totalDays; i++) {
      cumPlan   += planDay[i];
      const dateKey = format(addDays(tlStart, i), 'yyyy-MM-dd');
      const earnedToday = actualByDate.get(dateKey) || 0;
      cumActual += earnedToday;
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
