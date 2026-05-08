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
 * Weight structure:
 *  - Main activity (no parentId): a.weight = absolute % of total project (sums to 100)
 *  - Sub activity (has parentId):  a.weight = relative % within parent (designed to sum ~100)
 *    → absolute weight = parent.mainweight × (child.weight / sumSiblingWeights)
 *
 * Only LEAF activities (no children) contribute to the timeline spread.
 * totalWeight = sum of main activities' weights (same as GanttView banner).
 */
export function useSCurve(activities, scale = 'months') {
  return useMemo(() => {
    const empty = { data: [], totalWeight: 0, todayLabel: null };
    if (!activities || activities.length === 0) return empty;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build parent lookup and sibling-weight sums
    const activityMap = new Map(activities.map((a) => [a.id, a]));
    const siblingWeightSumMap = new Map(); // parentId → sum of children's weight
    activities.forEach((a) => {
      if (a.parentId) {
        siblingWeightSumMap.set(
          a.parentId,
          (siblingWeightSumMap.get(a.parentId) || 0) + (Number(a.weight) || 0)
        );
      }
    });

    // Identify parent ids (activities that have at least one child)
    const parentIdSet = new Set(activities.filter((a) => a.parentId).map((a) => a.parentId));

    // Leaf activities = activities that are NOT a parent of anyone
    const leaves = activities.filter((a) => !parentIdSet.has(a.id));
    if (leaves.length === 0) return empty;

    // totalWeight = sum of main activities' weight (absolute %, consistent with GanttView)
    const mainActivities = activities.filter((a) => !a.parentId);
    const totalWeight = mainActivities.reduce((s, a) => s + (Number(a.weight) || 0), 0);
    if (totalWeight === 0) return empty;

    /**
     * Compute absolute project weight for any activity.
     * - Main (no parentId): weight is already absolute
     * - Sub (has parentId): absolute = parent.mainweight × (this.weight / siblingSum)
     */
    function getAbsoluteWeight(a) {
      if (!a.parentId) return Number(a.weight) || 0;
      const parent = activityMap.get(a.parentId);
      if (!parent) return 0;
      const sibSum = siblingWeightSumMap.get(a.parentId) || 0;
      if (sibSum === 0) return 0;
      const parentMain = Number(parent.mainweight ?? parent.weight) || 0;
      return parentMain * (Number(a.weight) / sibSum);
    }

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
    const planDay      = new Float64Array(totalDays);
    const actualByDate = new Map(); // เก็บ earned value ตามวันที่รายงาน

    leaves.forEach((a) => {
      const w = getAbsoluteWeight(a); // absolute project weight
      if (w === 0) return;

      // ── Plan spread ─────────────────────────────────────────────────────
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

      // ── Actual: บันทึก earned value ทั้งหมดในวันที่รายงาน ───────────────
      const rawProgress = a.progress ?? a.actualProgress ?? 0;
      const progressVal = parseFloat(String(rawProgress).replace('%', '')) || 0;
      if (progressVal > 0) {
        const earned = w * (progressVal / 100);

        // ลำดับความสำคัญ: actualFinish (ถ้าไม่เกิน today) > actualStart > today
        let reportDate = safeISO(a.actualFinish);
        if (!reportDate || reportDate > today) {
          const aStart = safeISO(a.actualStart);
          reportDate = aStart && aStart <= today ? aStart : today;
        }

        // ขยายขอบเขตให้รองรับ today ที่อาจนอกช่วงแผน
        const extStart = min([tlStart, today]);
        const extEnd   = max([tlEnd, today]);
        if (reportDate >= extStart && reportDate <= extEnd) {
          const dateKey = format(reportDate, 'yyyy-MM-dd');
          actualByDate.set(dateKey, (actualByDate.get(dateKey) || 0) + earned);
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
