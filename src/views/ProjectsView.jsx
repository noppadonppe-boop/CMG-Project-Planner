import { useState } from 'react';
import {
  Plus, Pencil, Trash2, Copy, BarChart2,
  FolderKanban, Users, Activity, TrendingUp,
  CheckCircle2, Clock, PauseCircle, Database, Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ProjectFormModal from '../components/ProjectFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { seedToFirestore } from '../scripts/seedFirebase';

const STATUS_META = {
  active:    { label: 'กำลังดำเนินการ', cls: 'badge-status-active',    Icon: TrendingUp },
  planning:  { label: 'วางแผน',          cls: 'badge-status-planning',   Icon: Clock },
  'on-hold': { label: 'ระงับชั่วคราว',   cls: 'badge-status-on-hold',    Icon: PauseCircle },
  completed: { label: 'เสร็จสิ้น',       cls: 'badge-status-completed',  Icon: CheckCircle2 },
};

export default function ProjectsView() {
  const {
    projects, activities,
    addProject, updateProject, deleteProject, cloneProject,
    setSelectedProjectId, setActiveView,
  } = useApp();

  const [formModal, setFormModal] = useState({ open: false, project: null });
  const [confirmDel, setConfirmDel] = useState({ open: false, project: null });
  const [seeding, setSeeding]     = useState(false);
  const [seedDone, setSeedDone]   = useState(false);

  async function handleSeed() {
    if (!window.confirm('นำเข้าข้อมูลตัวอย่าง (Mock Data) เข้า Firebase Firestore?\nข้อมูลที่มีอยู่จะไม่ถูกลบ')) return;
    setSeeding(true);
    try {
      await seedToFirestore();
      setSeedDone(true);
    } catch (e) {
      console.error('Seed error:', e);
      alert('เกิดข้อผิดพลาด: ' + e.message);
    } finally {
      setSeeding(false);
    }
  }

  function openAdd()        { setFormModal({ open: true, project: null }); }
  function openEdit(proj)   { setFormModal({ open: true, project: proj }); }
  function openDelete(proj) { setConfirmDel({ open: true, project: proj }); }

  function handleSave(data) {
    if (formModal.project) {
      updateProject(formModal.project.id, data);
    } else {
      addProject(data);
    }
    setFormModal({ open: false, project: null });
  }

  function handleDelete() {
    if (confirmDel.project) deleteProject(confirmDel.project.id);
    setConfirmDel({ open: false, project: null });
  }

  function handleClone(proj) {
    cloneProject(proj.id);
  }

  function handleOpen(proj) {
    setSelectedProjectId(proj.id);
    setActiveView('gantt');
  }

  // Summary stats
  const totalActivities = activities.length;
  const statusCounts = Object.fromEntries(
    ['active', 'planning', 'on-hold', 'completed'].map((s) => [
      s,
      projects.filter((p) => p.status === s).length,
    ])
  );

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban size={22} className="text-accent-400" />
            จัดการโครงการ
          </h1>
          <p className="text-xs text-industrial-400 mt-0.5">
            เพิ่ม แก้ไข ลบ และสำเนาโครงการทั้งหมด
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!seedDone && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="btn-secondary text-xs flex items-center gap-1.5"
              title="นำเข้าข้อมูลตัวอย่าง Mock Data เข้า Firestore"
            >
              {seeding
                ? <Loader2 size={13} className="animate-spin" />
                : <Database size={13} />}
              {seeding ? 'กำลังนำเข้า…' : 'Seed Mock Data'}
            </button>
          )}
          <button onClick={openAdd} className="btn-primary">
            <Plus size={15} />
            เพิ่มโครงการใหม่
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <SummaryCard
          icon={<FolderKanban size={18} />}
          value={projects.length}
          label="โครงการทั้งหมด"
          color="bg-industrial-700 border-industrial-600"
          iconColor="text-industrial-300"
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          value={statusCounts.active}
          label="กำลังดำเนินการ"
          color="bg-green-900/40 border-green-700"
          iconColor="text-green-400"
        />
        <SummaryCard
          icon={<Activity size={18} />}
          value={totalActivities}
          label="กิจกรรมทั้งหมด"
          color="bg-blue-900/40 border-blue-700"
          iconColor="text-blue-400"
        />
        <SummaryCard
          icon={<Users size={18} />}
          value={new Set(projects.map((p) => p.projectManager)).size}
          label="Project Managers"
          color="bg-accent-600/20 border-accent-600/40"
          iconColor="text-accent-400"
        />
      </div>

      {/* Projects Table */}
      {projects.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-industrial-700/60 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-industrial-300 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-industrial-300 uppercase tracking-wider">ชื่อโครงการ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-industrial-300 uppercase tracking-wider">Project Manager</th>
                  <th className="px-4 py-3 text-xs font-semibold text-industrial-300 uppercase tracking-wider">สถานะ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-industrial-300 uppercase tracking-wider text-center">กิจกรรม</th>
                  <th className="px-4 py-3 text-xs font-semibold text-industrial-300 uppercase tracking-wider text-center">ความก้าวหน้าเฉลี่ย</th>
                  <th className="px-4 py-3 text-xs font-semibold text-industrial-300 uppercase tracking-wider text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-700/50">
                {projects.map((proj, idx) => {
                  const projActivities = activities.filter((a) => a.projectId === proj.id);
                  const rootActivities = projActivities.filter((a) => a.parentId === null);
                  const avgProgress = rootActivities.length > 0
                    ? Math.round(
                        rootActivities.reduce((sum, a) => sum + (a.weight / 100) * a.progress, 0)
                      )
                    : 0;
                  const meta = STATUS_META[proj.status] ?? STATUS_META.planning;

                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-industrial-700/30 transition-colors group"
                    >
                      <td className="px-4 py-3 text-industrial-500 text-xs font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpen(proj)}
                          className="font-medium text-white hover:text-accent-400 transition-colors text-left leading-tight"
                        >
                          {proj.name}
                        </button>
                        <div className="text-[10px] text-industrial-500 font-mono mt-0.5">{proj.id}</div>
                      </td>
                      <td className="px-4 py-3 text-industrial-200 text-xs">{proj.projectManager}</td>
                      <td className="px-4 py-3">
                        <span className={meta.cls}>
                          <meta.Icon size={10} className="mr-1" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-industrial-200 font-mono text-xs">{projActivities.length}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="flex-1 max-w-[80px] bg-industrial-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${avgProgress >= 80 ? 'bg-green-500' : avgProgress >= 40 ? 'bg-blue-500' : 'bg-accent-500'}`}
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-industrial-200 w-8 text-right">{avgProgress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionBtn
                            icon={<BarChart2 size={13} />}
                            label="เปิด Gantt"
                            onClick={() => handleOpen(proj)}
                            className="text-industrial-300 hover:text-white hover:bg-industrial-600"
                          />
                          <ActionBtn
                            icon={<Pencil size={13} />}
                            label="แก้ไข"
                            onClick={() => openEdit(proj)}
                            className="text-industrial-300 hover:text-white hover:bg-industrial-600"
                          />
                          <ActionBtn
                            icon={<Copy size={13} />}
                            label="สำเนา"
                            onClick={() => handleClone(proj)}
                            className="text-industrial-300 hover:text-accent-400 hover:bg-industrial-600"
                          />
                          <ActionBtn
                            icon={<Trash2 size={13} />}
                            label="ลบ"
                            onClick={() => openDelete(proj)}
                            className="text-industrial-300 hover:text-red-400 hover:bg-red-900/30"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status breakdown footer */}
      {projects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            statusCounts[key] > 0 && (
              <div key={key} className="flex items-center gap-1.5 text-xs text-industrial-400">
                <meta.Icon size={12} className="text-industrial-500" />
                <span>{meta.label}:</span>
                <span className="font-semibold text-industrial-200">{statusCounts[key]}</span>
              </div>
            )
          ))}
        </div>
      )}

      {/* Modals */}
      <ProjectFormModal
        isOpen={formModal.open}
        project={formModal.project}
        activities={activities}
        onSave={handleSave}
        onClose={() => setFormModal({ open: false, project: null })}
      />
      <ConfirmDialog
        isOpen={confirmDel.open}
        danger
        title="ลบโครงการ"
        message={`คุณต้องการลบโครงการ "${confirmDel.project?.name}" และกิจกรรมทั้งหมดที่เกี่ยวข้องใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบโครงการ"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel({ open: false, project: null })}
      />
    </div>
    </div>
  );
}

function SummaryCard({ icon, value, label, color, iconColor }) {
  return (
    <div className={`card border ${color} px-4 py-3 flex items-center gap-3`}>
      <div className={`${iconColor} shrink-0`}>{icon}</div>
      <div>
        <div className="text-xl font-bold text-white leading-none">{value}</div>
        <div className="text-[10px] text-industrial-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, className }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded transition-colors duration-100 ${className}`}
    >
      {icon}
    </button>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <FolderKanban size={40} className="text-industrial-600 mb-3" />
      <p className="text-industrial-300 font-medium">ยังไม่มีโครงการ</p>
      <p className="text-xs text-industrial-500 mt-1 mb-4">เริ่มต้นด้วยการสร้างโครงการแรกของคุณ</p>
      <button onClick={onAdd} className="btn-primary">
        <Plus size={14} />
        เพิ่มโครงการใหม่
      </button>
    </div>
  );
}
