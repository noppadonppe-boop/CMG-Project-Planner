import { useState } from 'react';
import { X, Plus, AlertCircle, Layers, GitBranch } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  weight: '',
  planStart: '',
  planFinish: '',
};

/**
 * Modal for adding a new Main Activity or Sub-activity.
 *
 * Props:
 *  isOpen        – boolean
 *  mode          – 'main' | 'sub'
 *  parentActivity – activity object (when mode='sub')
 *  totalWeight   – current sum of all leaf weights in the project
 *  onAdd         – (activityData) => void
 *  onClose       – () => void
 */
export default function ActivityManagerModal({
  isOpen, mode, parentActivity, totalWeight = 0, onAdd, onClose,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const isMain = mode === 'main';
  const remaining = isMain ? +(100 - totalWeight).toFixed(2) : null;
  const preview   = +form.weight || 0;
  const newTotal  = isMain ? +(totalWeight + preview).toFixed(2) : preview;
  const overBudget = isMain ? newTotal > 100 : preview > 100;

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'กรุณาระบุชื่องาน';
    const wt = Number(form.weight);
    if (form.weight === '' || isNaN(wt)) e.weight = 'กรุณาระบุ % Weight';
    else if (wt < 0 || wt > 100) e.weight = 'ระบุ 0–100%';
    else if (isMain && wt <= 0) e.weight = 'ระบุ % Weight > 0';
    if (!form.planStart)  e.planStart  = 'กรุณาระบุวันเริ่มแผน';
    if (!form.planFinish) e.planFinish = 'กรุณาระบุวันเสร็จแผน';
    if (form.planStart && form.planFinish && form.planFinish < form.planStart)
      e.planFinish = 'วันเสร็จต้องหลังวันเริ่ม';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onAdd({
      name:      form.name.trim(),
      weight:    Number(form.weight),
      planStart: form.planStart,
      planFinish: form.planFinish,
      actualStart: null,
      actualFinish: null,
      progress: 0,
      parentId: mode === 'sub' ? (parentActivity?.id ?? null) : null,
      wbs: mode === 'sub' ? `${parentActivity?.wbs ?? '?'}.?` : '?', // will be renumbered
    });
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,21,32,0.9)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-industrial-700">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isMain ? 'bg-accent-600' : 'bg-blue-700'}`}>
            {isMain ? <Layers size={14} className="text-white" /> : <GitBranch size={14} className="text-white" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {isMain ? 'เพิ่ม Main Activity ใหม่' : `เพิ่ม Sub-activity ใต้ ${parentActivity?.wbs} — ${parentActivity?.name}`}
            </h2>
            <p className="text-[10px] text-industrial-400">
              {isMain ? 'กิจกรรมหลัก (Level 1)' : 'กิจกรรมย่อย (Level 2)'}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto btn-ghost p-1.5"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-1">
              ชื่องาน *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="เช่น งานโครงสร้างชั้น 4"
              className={`w-full bg-industrial-700 border ${errors.name ? 'border-red-500' : 'border-industrial-600'}
                text-industrial-100 text-xs rounded px-3 py-2 focus:outline-none focus:border-accent-500 transition-colors`}
            />
            {errors.name && <Err msg={errors.name} />}
          </div>

          {/* Weight */}
          <div>
            <label className="block text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>% น้ำหนักงาน (Weight) *</span>
              {isMain && (
                <span className={`text-[10px] font-mono ${remaining <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  เหลือได้: {remaining}%
                </span>
              )}
            </label>
            <input
              type="number"
              value={form.weight}
              min={0} max={100} step={0.01}
              onChange={(e) => set('weight', e.target.value)}
              placeholder={isMain ? `แนะนำ ≤ ${remaining}%` : '0–100'}
              className={`w-full bg-industrial-700 border ${errors.weight ? 'border-red-500' : 'border-industrial-600'}
                text-industrial-100 text-xs rounded px-3 py-2 focus:outline-none focus:border-accent-500 transition-colors`}
            />
            {errors.weight && <Err msg={errors.weight} />}
            {!isMain && (
              <p className="text-[10px] text-industrial-500 mt-1">น้ำหนัก Sub ไม่นำไปคำนวณ Weight รวมของโครงการ — ใส่ 0–100 ได้ตามต้องการ</p>
            )}

            {/* Live weight meter — Main เท่านั้น */}
            {isMain && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-industrial-400">รวมหลังเพิ่ม</span>
                  <span className={`font-mono font-bold ${overBudget ? 'text-red-400' : newTotal === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {newTotal}% / 100%
                  </span>
                </div>
                <div className="w-full h-2 bg-industrial-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : newTotal === 100 ? 'bg-green-500' : 'bg-accent-500'}`}
                    style={{ width: `${Math.min(100, newTotal)}%` }}
                  />
                </div>
                {overBudget && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={9} />
                    เกิน 100% — รวมจะเท่ากับ {newTotal}% กรุณาลดค่า Weight
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Plan dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-1">วันเริ่มแผน *</label>
              <input type="date" value={form.planStart}
                onChange={(e) => set('planStart', e.target.value)}
                className={`w-full bg-industrial-700 border ${errors.planStart ? 'border-red-500' : 'border-industrial-600'}
                  text-industrial-100 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent-500 transition-colors`}
              />
              {errors.planStart && <Err msg={errors.planStart} />}
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-1">วันเสร็จแผน *</label>
              <input type="date" value={form.planFinish}
                onChange={(e) => set('planFinish', e.target.value)}
                className={`w-full bg-industrial-700 border ${errors.planFinish ? 'border-red-500' : 'border-industrial-600'}
                  text-industrial-100 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent-500 transition-colors`}
              />
              {errors.planFinish && <Err msg={errors.planFinish} />}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">ยกเลิก</button>
            <button
              type="submit"
              disabled={overBudget}
              className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={13} />
              เพิ่มกิจกรรม
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Err({ msg }) {
  return (
    <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1">
      <AlertCircle size={9} />{msg}
    </p>
  );
}
