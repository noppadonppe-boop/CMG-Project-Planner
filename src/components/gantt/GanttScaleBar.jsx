import { CalendarDays, CalendarRange, Calendar, CalendarClock, Printer, TrendingUp, Plus } from 'lucide-react';

const SCALES = [
  { key: 'weeks',  label: 'สัปดาห์', Icon: CalendarDays },
  { key: 'months', label: 'เดือน',   Icon: CalendarRange },
  { key: 'years',  label: 'ปี',      Icon: Calendar },
];

export default function GanttScaleBar({
  scale, onScale, projectName,
  hasNoActivities, onAddMain,
  showLookahead, onToggleLookahead,
  showSCurve, onToggleSCurve,
  onPrint,
}) {
  return (
    <div className="no-print flex items-center gap-2 px-4 py-2 bg-industrial-800 border-b border-industrial-600">
      {/* Project name + ปุ่ม + รายการ Main เมื่อยังไม่มี Activity */}
      <span className="text-xs font-semibold text-industrial-300 truncate max-w-[180px] hidden sm:block">
        {projectName}
      </span>
      {hasNoActivities && onAddMain && (
        <button
          type="button"
          onClick={onAddMain}
          title="เพิ่มรายการ Main Activity แรก"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                     bg-accent-600/30 text-accent-400 border border-accent-600/50
                     hover:bg-accent-600/60 hover:text-white transition-colors"
        >
          <Plus size={12} />
          รายการ Main
        </button>
      )}

      <div className="flex-1" />

      {/* S-Curve toggle */}
      <button
        onClick={onToggleSCurve}
        title="แสดง/ซ่อน S-Curve"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors duration-150 border ${
          showSCurve
            ? 'bg-blue-700/40 text-blue-300 border-blue-600'
            : 'text-industrial-400 border-industrial-600 hover:text-white hover:bg-industrial-700'
        }`}
      >
        <TrendingUp size={12} />
        S-Curve
      </button>

      {/* 3-Week Lookahead toggle */}
      <button
        onClick={onToggleLookahead}
        title="3-Week Lookahead"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors duration-150 border ${
          showLookahead
            ? 'bg-accent-500/20 text-accent-300 border-accent-500/60'
            : 'text-industrial-400 border-industrial-600 hover:text-white hover:bg-industrial-700'
        }`}
      >
        <CalendarClock size={12} />
        3-Week
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-industrial-600" />

      {/* Scale switcher */}
      <div className="flex items-center gap-0.5 bg-industrial-700 rounded p-0.5">
        {SCALES.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onScale(key)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ${
              scale === key
                ? 'bg-accent-500 text-white'
                : 'text-industrial-300 hover:text-white hover:bg-industrial-600'
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-industrial-600" />

      {/* Print */}
      <button
        onClick={onPrint}
        title="พิมพ์รายงาน A4"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
                   text-industrial-400 border border-industrial-600 hover:text-white hover:bg-industrial-700
                   transition-colors duration-150"
      >
        <Printer size={12} />
        พิมพ์
      </button>
    </div>
  );
}
