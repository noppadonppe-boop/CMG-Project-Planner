import { BarChart2, BookOpen, ChevronDown, FolderKanban, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STATUS_LABELS = {
  active:    { label: 'กำลังดำเนินการ', cls: 'badge-status-active' },
  planning:  { label: 'วางแผน',         cls: 'badge-status-planning' },
  'on-hold': { label: 'ระงับชั่วคราว',  cls: 'badge-status-on-hold' },
  completed: { label: 'เสร็จสิ้น',      cls: 'badge-status-completed' },
};

export default function Navbar() {
  const {
    projects,
    selectedProjectId,
    selectedProject,
    activeView,
    setSelectedProjectId,
    setActiveView,
    setIsManualOpen,
  } = useApp();

  return (
    <header className="no-print sticky top-0 z-50 bg-industrial-900 border-b border-industrial-700 shadow-lg">
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-accent-500 rounded flex items-center justify-center">
            <Layers size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white tracking-wide">CMG Planner</div>
            <div className="text-[10px] text-industrial-400 tracking-wider uppercase">Project Planning & Tracking</div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="relative ml-4">
          <label className="text-[10px] text-industrial-400 uppercase tracking-wider block mb-0.5">
            โครงการ
          </label>
          <div className="relative">
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none bg-industrial-800 border border-industrial-600 text-industrial-100
                         text-sm rounded px-3 pr-8 py-1 cursor-pointer focus:outline-none
                         focus:border-accent-500 min-w-[260px] max-w-xs truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-industrial-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Project status badge */}
        {selectedProject && (
          <span className={STATUS_LABELS[selectedProject.status]?.cls ?? 'badge-status-planning'}>
            {STATUS_LABELS[selectedProject.status]?.label ?? selectedProject.status}
          </span>
        )}

        {/* Manager */}
        {selectedProject && (
          <span className="text-xs text-industrial-400 hidden md:block">
            PM: <span className="text-industrial-200">{selectedProject.manager}</span>
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1">
          <NavTab
            icon={<BarChart2 size={15} />}
            label="Gantt / S-Curve"
            active={activeView === 'gantt'}
            onClick={() => setActiveView('gantt')}
          />
          <NavTab
            icon={<FolderKanban size={15} />}
            label="จัดการโครงการ"
            active={activeView === 'projects'}
            onClick={() => setActiveView('projects')}
          />
        </nav>

        {/* Help */}
        <button
          onClick={() => setIsManualOpen(true)}
          className="btn-ghost ml-2"
          title="คู่มือการใช้งาน"
        >
          <BookOpen size={15} />
          <span className="hidden sm:inline">คู่มือ</span>
        </button>
      </div>
    </header>
  );
}

function NavTab({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors duration-150 cursor-pointer select-none ${
        active
          ? 'bg-accent-500 text-white'
          : 'text-industrial-300 hover:text-industrial-100 hover:bg-industrial-700'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
