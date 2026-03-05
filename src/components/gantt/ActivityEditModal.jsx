import { useState, useEffect } from 'react';
import { X, Pencil, Save, Calendar, Percent, AlertCircle } from 'lucide-react';

const EMPTY = {
  planStart: '', planFinish: '',
  actualStart: '', actualFinish: '',
  progress: 0, weight: 0,
};

export default function ActivityEditModal({ isOpen, activity, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && activity) {
      setForm({
        planStart:    activity.planStart    ?? '',
        planFinish:   activity.planFinish   ?? '',
        actualStart:  activity.actualStart  ?? '',
        actualFinish: activity.actualFinish ?? '',
        progress:     activity.progress     ?? 0,
        weight:       activity.weight       ?? 0,
      });
      setErrors({});
    }
  }, [isOpen, activity]);

  if (!isOpen || !activity) return null;

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.planStart)  e.planStart  = 'กรุณาระบุวันเริ่มแผน';
    if (!form.planFinish) e.planFinish = 'กรุณาระบุวันเสร็จแผน';
    if (form.planStart && form.planFinish && form.planFinish < form.planStart)
      e.planFinish = 'วันเสร็จต้องหลังวันเริ่ม';
    if (form.actualStart && form.actualFinish && form.actualFinish < form.actualStart)
      e.actualFinish = 'วันเสร็จจริงต้องหลังวันเริ่มจริง';
    const prog = Number(form.progress);
    if (isNaN(prog) || prog < 0 || prog > 100) e.progress = '0–100 เท่านั้น';
    const wt = Number(form.weight);
    if (isNaN(wt) || wt < 0 || wt > 100) e.weight = '0–100 เท่านั้น';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(activity.id, {
      planStart:    form.planStart    || null,
      planFinish:   form.planFinish   || null,
      actualStart:  form.actualStart  || null,
      actualFinish: form.actualFinish || null,
      progress:     Number(form.progress),
      weight:       Number(form.weight),
    });
  }

  const isMain = !activity.parentId;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,21,32,0.88)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-industrial-700">
          <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Pencil size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-industrial-500">{activity.wbs}</span>
              {isMain
                ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-600/30 text-accent-400 border border-accent-600/40">Main</span>
                : <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-600/50 text-industrial-300 border border-industrial-600">Sub</span>
              }
            </div>
            <h2 className="text-sm font-bold text-white truncate mt-0.5" title={activity.name}>{activity.name}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 shrink-0"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Plan dates */}
          <fieldset className="border border-industrial-600 rounded-lg px-4 py-3">
            <legend className="px-1 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={10} /> แผนงาน (Baseline)
            </legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <DateField label="วันเริ่มแผน *" value={form.planStart}
                onChange={(v) => set('planStart', v)} error={errors.planStart} />
              <DateField label="วันเสร็จแผน *" value={form.planFinish}
                onChange={(v) => set('planFinish', v)} error={errors.planFinish} />
            </div>
          </fieldset>

          {/* Actual dates */}
          <fieldset className="border border-blue-700/50 rounded-lg px-4 py-3">
            <legend className="px-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={10} /> ผลงานจริง (Actual)
            </legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <DateField label="วันเริ่มจริง" value={form.actualStart}
                onChange={(v) => set('actualStart', v)} error={errors.actualStart} />
              <DateField label="วันเสร็จจริง" value={form.actualFinish}
                onChange={(v) => set('actualFinish', v)} error={errors.actualFinish} />
            </div>
          </fieldset>

          {/* Progress + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="ความก้าวหน้า (%)" icon={<Percent size={11} />}
              value={form.progress} min={0} max={100}
              onChange={(v) => set('progress', v)} error={errors.progress}
            />
            <NumberField
              label="น้ำหนัก (%)" icon={<Percent size={11} />}
              value={form.weight} min={0} max={100}
              onChange={(v) => set('weight', v)} error={errors.weight}
              disabled={isMain && activity._hasChildren}
              hint={isMain && activity._hasChildren ? 'คำนวณจาก Sub' : ''}
            />
          </div>

          {/* Progress preview bar */}
          <div className="bg-industrial-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                Number(form.progress) >= 100 ? 'bg-green-500' :
                Number(form.progress) >= 60  ? 'bg-blue-500'  :
                Number(form.progress) >= 30  ? 'bg-accent-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, Number(form.progress) || 0))}%` }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">ยกเลิก</button>
            <button type="submit" className="btn-primary text-xs">
              <Save size={13} />
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, error }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-industrial-400 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-industrial-700 border ${error ? 'border-red-500' : 'border-industrial-600'}
          text-industrial-100 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent-500 transition-colors`}
      />
      {error && <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1"><AlertCircle size={9}/>{error}</p>}
    </div>
  );
}

function NumberField({ label, icon, value, min, max, onChange, error, disabled, hint }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-industrial-400 mb-1 flex items-center gap-1">
        {icon}{label}
      </label>
      <input
        type="number"
        value={value}
        min={min} max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-industrial-700 border ${error ? 'border-red-500' : 'border-industrial-600'}
          text-industrial-100 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent-500
          transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
      />
      {hint && <p className="text-[10px] text-industrial-500 mt-0.5">{hint}</p>}
      {error && <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1"><AlertCircle size={9}/>{error}</p>}
    </div>
  );
}
