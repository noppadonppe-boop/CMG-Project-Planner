import { useMemo } from 'react';
import { parseISO, isValid, addWeeks, subWeeks, format, differenceInCalendarDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { CalendarClock, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

function safeISO(s) {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

function fmt(s) {
  const d = safeISO(s);
  return d ? format(d, 'd MMM yyyy', { locale: th }) : '—';
}

function getRowStatus(row, today) {
  const pS = safeISO(row.planStart);
  const pF = safeISO(row.planFinish);
  const aS = safeISO(row.actualStart);
  const aF = safeISO(row.actualFinish);

  if (aF) return { key: 'done',    label: 'เสร็จแล้ว',       cls: 'bg-green-900/40 text-green-300 border-green-700',      Icon: CheckCircle2 };
  if (aS)  return { key: 'ongoing', label: 'กำลังดำเนินการ',  cls: 'bg-blue-900/40 text-blue-300 border-blue-700',         Icon: TrendingUp };
  if (pS && pF && today > pF && !aS)
           return { key: 'late',   label: 'ล่าช้า (ไม่เริ่ม)', cls: 'bg-red-900/40 text-red-300 border-red-700',           Icon: AlertTriangle };
  return   { key: 'upcoming', label: 'จะเริ่มเร็วๆ นี้',   cls: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/60', Icon: Clock };
}

export default function LookaheadView({ activities, projectName }) {
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);

  const windowStart = subWeeks(today, 1);
  const windowEnd   = addWeeks(today, 3);

  // Filter: ongoing OR planStart / actualStart within lookahead window
  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const pS = safeISO(a.planStart);
      const pF = safeISO(a.planFinish);
      const aS = safeISO(a.actualStart);
      const aF = safeISO(a.actualFinish);

      const isOngoing  = aS && !aF;
      const planInWin  = pS && pS >= windowStart && pS <= windowEnd;
      const actInWin   = aS && aS >= windowStart && aS <= windowEnd;
      const spanCurrent = pS && pF && pS <= today && pF >= today;

      return isOngoing || planInWin || actInWin || spanCurrent;
    }).sort((a, b) => {
      const da = safeISO(a.planStart) ?? new Date(9999, 0);
      const db = safeISO(b.planStart) ?? new Date(9999, 0);
      return da - db;
    });
  }, [activities, windowStart, windowEnd, today]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-accent-500 rounded-lg flex items-center justify-center shrink-0">
            <CalendarClock size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">3-Week Lookahead</h2>
            <p className="text-xs text-industrial-400">
              {format(windowStart, 'd MMM', { locale: th })} → {format(windowEnd, 'd MMM yyyy', { locale: th })} · {projectName}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-industrial-400">
            <span className="font-semibold text-white">{filtered.length}</span> กิจกรรม
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4 no-print">
          {[
            { label: 'กำลังดำเนินการ', cls: 'bg-blue-900/40 text-blue-300 border-blue-700' },
            { label: 'จะเริ่มเร็วๆ นี้', cls: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/60' },
            { label: 'ล่าช้า',          cls: 'bg-red-900/40 text-red-300 border-red-700' },
            { label: 'เสร็จแล้ว',       cls: 'bg-green-900/40 text-green-300 border-green-700' },
          ].map((s) => (
            <span key={s.label} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${s.cls}`}>
              {s.label}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock size={36} className="text-industrial-600 mb-3" />
            <p className="text-industrial-300 font-medium">ไม่มีกิจกรรมในช่วง 3 สัปดาห์นี้</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-industrial-700/60 text-left">
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-12">WBS</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider">ชื่องาน</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-24">แผนเริ่ม</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-24">แผนเสร็จ</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-24">เริ่มจริง</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-24">เสร็จจริง</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-20 text-right">น้ำหนัก</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-28">ความก้าวหน้า</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider w-28">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-700/50">
                {filtered.map((row) => {
                  const status = getRowStatus(row, today);
                  const isMain = !row.parentId;
                  const pF = safeISO(row.planFinish);
                  const daysLeft = pF ? differenceInCalendarDays(pF, today) : null;

                  return (
                    <tr
                      key={row.id}
                      className={`${isMain ? 'bg-industrial-800/50' : 'bg-industrial-900/20'} hover:bg-industrial-700/30 transition-colors`}
                    >
                      <td className="px-3 py-2.5 font-mono text-industrial-500">{row.wbs}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-medium ${isMain ? 'text-white' : 'text-industrial-200 pl-3'}`}>
                          {row.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-industrial-300">{fmt(row.planStart)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-mono ${daysLeft !== null && daysLeft < 0 && !row.actualFinish ? 'text-red-400 font-bold' : 'text-industrial-300'}`}>
                          {fmt(row.planFinish)}
                        </span>
                        {daysLeft !== null && !row.actualFinish && (
                          <span className={`ml-1 text-[9px] ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-yellow-400' : 'text-industrial-500'}`}>
                            ({daysLeft < 0 ? `เกิน ${Math.abs(daysLeft)}d` : `เหลือ ${daysLeft}d`})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-industrial-300">{fmt(row.actualStart)}</td>
                      <td className="px-3 py-2.5 font-mono text-industrial-300">{fmt(row.actualFinish)}</td>
                      <td className="px-3 py-2.5 font-mono text-industrial-300 text-right">{row.weight}%</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-industrial-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.progress >= 100 ? 'bg-green-500' : row.progress >= 60 ? 'bg-blue-500' : 'bg-accent-500'}`}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-industrial-200 w-7 text-right">{row.progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${status.cls}`}>
                          <status.Icon size={9} />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
