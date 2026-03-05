import { useState, useEffect, useMemo } from 'react';
import { X, FolderKanban, Save } from 'lucide-react';
import { parseISO, isValid, min, max, format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'planning',  label: 'วางแผน (Planning)' },
  { value: 'active',    label: 'กำลังดำเนินการ (Active)' },
  { value: 'on-hold',   label: 'ระงับชั่วคราว (On Hold)' },
  { value: 'completed', label: 'เสร็จสิ้น (Completed)' },
];

const EMPTY_FORM = {
  name: '',
  projectManager: '',
  constructionManager: '',
  status: 'planning',
  startDate: '',
  finishDate: '',
  note: '',
};

export default function ProjectFormModal({ isOpen, project, activities = [], onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Compute date range from activities for this project
  const activityDateRange = useMemo(() => {
    if (!project) return null;
    const projActs = activities.filter((a) => a.projectId === project.id);
    const allDates = projActs.flatMap((a) => [a.planStart, a.planFinish].filter(Boolean).map(parseISO).filter(isValid));
    if (allDates.length === 0) return null;
    return {
      start: format(min(allDates), 'yyyy-MM-dd'),
      finish: format(max(allDates), 'yyyy-MM-dd'),
    };
  }, [project, activities]);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        // Edit mode: use project data, but override dates with activity range if available
        const range = activityDateRange;
        setForm({
          name: project.name,
          projectManager: project.projectManager || '',
          constructionManager: project.constructionManager || '',
          status: project.status,
          startDate: range?.start || project.startDate || '',
          finishDate: range?.finish || project.finishDate || '',
          note: project.note || '',
        });
      } else {
        // Add mode
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [isOpen, project, activityDateRange]);

  if (!isOpen) return null;

  const isEdit = Boolean(project);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'กรุณาระบุชื่อโครงการ';
    if (!form.projectManager.trim()) errs.projectManager = 'กรุณาระบุชื่อ Project Manager';
    if (!form.constructionManager.trim()) errs.constructionManager = 'กรุณาระบุชื่อ Construction Manager';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      name: form.name.trim(),
      projectManager: form.projectManager.trim(),
      constructionManager: form.constructionManager.trim(),
      status: form.status,
      startDate: form.startDate,
      finishDate: form.finishDate,
      note: form.note.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,21,32,0.88)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-industrial-700">
          <div className="w-9 h-9 bg-accent-500 rounded-lg flex items-center justify-center shrink-0">
            <FolderKanban size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {isEdit ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}
            </h2>
            <p className="text-xs text-industrial-400">
              {isEdit ? `แก้ไข: ${project.name}` : 'กรอกข้อมูลโครงการ'}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="ชื่อโครงการ *" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="เช่น โครงการก่อสร้างอาคาร B"
              className={inputCls(errors.name)}
              autoFocus
            />
          </Field>

          <Field label="Project Manager *" error={errors.projectManager}>
            <input
              type="text"
              value={form.projectManager}
              onChange={(e) => set('projectManager', e.target.value)}
              placeholder="เช่น นายสมชาย ใจดี"
              className={inputCls(errors.projectManager)}
            />
          </Field>

          <Field label="Construction Manager *" error={errors.constructionManager}>
            <input
              type="text"
              value={form.constructionManager}
              onChange={(e) => set('constructionManager', e.target.value)}
              placeholder="เช่น นายประสิทธิ์ ช่างฝีมือ"
              className={inputCls(errors.constructionManager)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" hint={isEdit && activityDateRange ? "ดึงจาก Gantt แผนเริ่ม" : undefined}>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className={inputCls()}
                readOnly={isEdit && activityDateRange}
              />
            </Field>

            <Field label="Finish Date" hint={isEdit && activityDateRange ? "ดึงจาก Gantt แผนเสร็จ" : undefined}>
              <input
                type="date"
                value={form.finishDate}
                onChange={(e) => set('finishDate', e.target.value)}
                className={inputCls()}
                readOnly={isEdit && activityDateRange}
              />
            </Field>
          </div>

          <Field label="Note">
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="บันทึกเพิ่มเติม..."
              rows={3}
              className={inputCls()}
            />
          </Field>

          <Field label="สถานะโครงการ">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={inputCls()}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
            <button type="submit" className="btn-primary">
              <Save size={14} />
              {isEdit ? 'บันทึกการแก้ไข' : 'สร้างโครงการ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-industrial-300 mb-1">
        {label}
        {hint && <span className="ml-1.5 text-[10px] text-accent-400 font-normal">({hint})</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(error) {
  const border = error ? 'border-red-500' : 'border-industrial-600';
  return `w-full bg-industrial-700 border ${border} text-industrial-100 text-sm rounded px-3 py-2 focus:outline-none focus:border-accent-500 placeholder-industrial-500 transition-colors`;
}
