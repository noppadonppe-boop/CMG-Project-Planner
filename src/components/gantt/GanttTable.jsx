import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, GitBranch, GripVertical, Calendar, X, Save } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { th } from 'date-fns/locale';

const ROW_HEIGHT = 40;

function fmt(str) {
  if (!str) return '—';
  const d = parseISO(str);
  return isValid(d) ? format(d, 'd MMM yy', { locale: th }) : '—';
}

function progressColor(p) {
  if (p >= 100) return 'bg-green-500';
  if (p >= 60)  return 'bg-blue-500';
  if (p >= 30)  return 'bg-accent-500';
  return 'bg-red-500';
}

export default function GanttTable({
  rows, collapsed, onToggle, onEdit,
  onAddMain, onAddSub, onDelete, onReorder,
  onUpdate,
  ROW_H = ROW_HEIGHT,
}) {
  // ── Drag-and-drop state (sub activities only) ─────────────────────────
  const dragId   = useRef(null);   // id of the row being dragged
  const dragParent = useRef(null); // parentId of the dragged row
  const [dragOverId, setDragOverId] = useState(null); // id of the row currently hovered

  // ── Column width (resizable headers) ───────────────────────────────────
  const [colWidths, setColWidths] = useState({
    wbs: 52,
    name: 200,
    weight: 70,
    plan: 140,
    progress: 90,
    actions: 64,
  });

  // ── Plan date popup editor state ───────────────────────────────────────
  const [dateEditor, setDateEditor] = useState(null);
  
  // ── Weight editor state for Main Activities ─────────────────────────────
  const [weightEditor, setWeightEditor] = useState(null);

  function startResize(colKey, e) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] ?? 60;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const raw = startWidth + dx;
      const next = Math.max(40, raw);
      setColWidths((prev) => {
        if (prev[colKey] === next) return prev;
        return { ...prev, [colKey]: next };
      });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleDragStart(e, row) {
    dragId.current     = row.id;
    dragParent.current = row.parentId;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, row) {
    // Only allow drop on sub rows with the same parent
    if (!dragId.current) return;
    if (row.parentId !== dragParent.current) return;
    if (row.id === dragId.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(row.id);
  }

  function handleDrop(e, targetRow) {
    e.preventDefault();
    setDragOverId(null);
    if (!dragId.current) return;
    if (targetRow.parentId !== dragParent.current) return;
    if (targetRow.id === dragId.current) return;

    // Rebuild ordered sub-id list by moving dragged item before the target
    const parentId  = dragParent.current;
    const siblings  = rows.filter((r) => r.parentId === parentId);
    const ids       = siblings.map((r) => r.id);
    const fromIdx   = ids.indexOf(dragId.current);
    const toIdx     = ids.indexOf(targetRow.id);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, dragId.current);

    onReorder && onReorder(parentId, reordered);
    dragId.current     = null;
    dragParent.current = null;
  }

  function handleDragEnd() {
    setDragOverId(null);
    dragId.current     = null;
    dragParent.current = null;
  }

  function openDateEditor(row) {
    setDateEditor({
      id: row.id,
      wbs: row.wbs,
      name: row.name,
      planStart: row.planStart || '',
      planFinish: row.planFinish || '',
    });
  }

  function closeDateEditor() {
    setDateEditor(null);
  }

  function updateDateField(field, value) {
    setDateEditor((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function saveDates() {
    if (!dateEditor || !onUpdate) return;
    onUpdate(dateEditor.id, {
      planStart: dateEditor.planStart || null,
      planFinish: dateEditor.planFinish || null,
    });
    setDateEditor(null);
  }

  function openWeightEditor(row) {
    setWeightEditor({
      id: row.id,
      wbs: row.wbs,
      name: row.name,
      mainweight: row.mainweight || row.weight || 0,
    });
  }

  function closeWeightEditor() {
    setWeightEditor(null);
  }

  function updateWeightField(value) {
    setWeightEditor((prev) => (prev ? { ...prev, mainweight: value } : prev));
  }

  function saveWeight() {
    if (!weightEditor || !onUpdate) return;
    const val = Number(weightEditor.mainweight) || 0;
    onUpdate(weightEditor.id, {
      mainweight: Math.round(val * 100) / 100,
    });
    setWeightEditor(null);
  }

  return (
    <div className="shrink-0 border-r-2 border-industrial-600 flex flex-col select-none overflow-hidden" style={{ minWidth: 'min-content' }}>

      {/* ── Column Header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 bg-industrial-800 border-b border-industrial-600"
        style={{ height: 56 }}
      >
        <div className="flex h-full items-end">
          <ColHead
            label="WBS"
            width={colWidths.wbs}
            onResize={(e) => startResize('wbs', e)}
          />
          <ColHead 
            label="ชื่องาน" 
            width={colWidths.name || 200}
            onResize={(e) => startResize('name', e)}
          />
          <ColHead
            label="น้ำหนัก"
            width={colWidths.weight}
            onResize={(e) => startResize('weight', e)}
          />
          <ColHead
            label="แผน (เริ่ม / เสร็จ)"
            width={colWidths.plan}
            onResize={(e) => startResize('plan', e)}
          />
          <ColHead
            label="ความก้าวหน้า"
            width={colWidths.progress}
            onResize={(e) => startResize('progress', e)}
          />
          {/* actions column */}
          <div
            className="shrink-0 flex items-end justify-center pb-2 border-l border-industrial-700/50"
            style={{ width: colWidths.actions }}
          >
            <button
              onClick={onAddMain}
              title="เพิ่ม Main Activity"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
                         bg-accent-600/30 text-accent-400 border border-accent-600/50
                         hover:bg-accent-600/60 hover:text-white transition-colors"
            >
              <Plus size={9} />Main
            </button>
          </div>
        </div>
      </div>

      {/* ── Data Rows ── */}
      <div>
        {rows.map((row) => {
          const isMain  = !row.parentId;
          const hasKids = row._hasChildren;
          const isCol   = collapsed.has(row.id);
          const isDragOver = dragOverId === row.id;

          return (
            <div
              key={row.id}
              draggable={!isMain}
              onDragStart={!isMain ? (e) => handleDragStart(e, row) : undefined}
              onDragOver={!isMain  ? (e) => handleDragOver(e, row)  : undefined}
              onDrop={!isMain      ? (e) => handleDrop(e, row)      : undefined}
              onDragEnd={!isMain   ? handleDragEnd                  : undefined}
              className={`group flex items-center border-b transition-colors cursor-pointer
                ${ isDragOver
                    ? 'border-accent-400 bg-accent-600/20'
                    : isMain
                      ? 'border-industrial-700/60 bg-industrial-800/70 hover:bg-industrial-700/50'
                      : 'border-industrial-700/60 bg-industrial-900/40 hover:bg-industrial-700/20'
                }`}
              style={{ height: ROW_H }}
            >
              {/* WBS */}
              <div
                className="shrink-0 flex items-center justify-center text-[10px] font-mono text-industrial-400"
                style={{ width: colWidths.wbs }}
              >
                {row.wbs}
              </div>

              {/* Name */}
              <div 
                className="shrink-0 flex items-center gap-1 pr-1"
                style={{ width: colWidths.name }}
              >
                {/* Drag handle for sub rows */}
                {!isMain ? (
                  <span
                    className="shrink-0 text-industrial-600 hover:text-industrial-300 cursor-grab active:cursor-grabbing"
                    style={{ width: 12 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical size={11} />
                  </span>
                ) : (
                  <span style={{ width: 12 }} />
                )}
                {hasKids ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(row.id); }}
                    className="shrink-0 text-industrial-400 hover:text-white transition-colors"
                  >
                    {isCol ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </button>
                ) : (
                  <span className="shrink-0" style={{ width: 13 }} />
                )}
                <span
                  className={`flex-1 truncate text-xs leading-tight ${isMain ? 'font-semibold text-white' : 'text-industrial-200'}`}
                  title={row.name}
                  style={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}
                >
                  {row.name}
                </span>
                <Pencil
                  size={10}
                  className="shrink-0 text-industrial-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                />
              </div>

              {/* Weight */}
              <div
                className="shrink-0 px-1 text-xs text-industrial-300 flex items-center"
                style={{ width: colWidths.weight }}
              >
                {isMain && hasKids ? (
                  // Main Activity with sub-activities: Show calculated weight with Set Weight button
                  <button
                    type="button"
                    className="w-full text-left hover:bg-industrial-700/50 rounded px-1 py-0.5 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openWeightEditor(row);
                    }}
                    title="กดเพื่อตั้งค่า Main Weight"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px]">{(+row.weight).toFixed(2)}%</span>
                      <span className="text-[8px] text-industrial-500">Set</span>
                    </div>
                  </button>
                ) : (
                  // Sub-activities or Main without subs: Direct input
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="number"
                      className="w-full bg-industrial-800 border border-industrial-700 rounded px-1 py-0.5 text-[10px] text-industrial-100 focus:outline-none focus:border-accent-500"
                      value={row.weight ?? ''}
                      min={0}
                      max={100}
                      step={0.01}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (!onUpdate) return;
                        const v = e.target.value;
                        const num = v === '' ? 0 : Number(v);
                        if (Number.isNaN(num)) return;
                        const rounded = Math.round(num * 100) / 100;
                        onUpdate(row.id, { weight: rounded });
                      }}
                    />
                    <span className="text-[10px] text-industrial-400 shrink-0">%</span>
                  </div>
                )}
              </div>

              {/* Plan (Start / Finish in one column) */}
              <button
                type="button"
                className="shrink-0 px-1 text-[10px] text-industrial-300 flex items-center justify-center text-left"
                style={{ width: colWidths.plan }}
                onClick={(e) => {
                  e.stopPropagation();
                  openDateEditor(row);
                }}
              >
                <div className="flex flex-col leading-tight w-full">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] text-industrial-500">เริ่ม</span>
                    <span className="font-mono">{fmt(row.planStart)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[9px] text-industrial-500">เสร็จ</span>
                    <span className="font-mono">{fmt(row.planFinish)}</span>
                  </div>
                </div>
              </button>

              {/* Progress */}
              <div
                className="shrink-0 flex items-center gap-1.5 px-2"
                style={{ width: colWidths.progress }}
              >
                <div className="flex-1 bg-industrial-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(row.progress)}`}
                    style={{ width: `${row.progress}%` }}
                  />
                </div>
                <input
                  type="number"
                  className="w-11 bg-industrial-800 border border-industrial-700 rounded px-1 py-0.5 text-[10px] text-industrial-100 text-right focus:outline-none focus:border-accent-500"
                  value={row.progress ?? 0}
                  min={0}
                  max={100}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    if (!onUpdate) return;
                    const v = e.target.value;
                    const num = v === '' ? 0 : Number(v);
                    if (Number.isNaN(num)) return;
                    const clamped = Math.max(0, Math.min(100, num));
                    onUpdate(row.id, { progress: clamped });
                  }}
                />
                <span className="text-[10px] font-mono text-industrial-400 w-3 text-left">%</span>
              </div>

              {/* Row actions */}
              <div
                className="shrink-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ width: colWidths.actions }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Add Sub button — only on Main activities */}
                {isMain && (
                  <button
                    onClick={() => onAddSub && onAddSub(row)}
                    title="เพิ่ม Sub-activity"
                    className="p-1 rounded text-blue-400 hover:text-white hover:bg-blue-700/50 transition-colors"
                  >
                    <GitBranch size={12} />
                  </button>
                )}
                {/* Delete */}
                <button
                  onClick={() => onDelete && onDelete(row)}
                  title={isMain ? 'ลบ Main Activity (และ Sub ทั้งหมด)' : 'ลบ Sub-activity'}
                  className="p-1 rounded text-red-400 hover:text-white hover:bg-red-700/50 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weight editor popup */}
      {weightEditor && (
        <div
          className="fixed inset-0 z-[155] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10,21,32,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeWeightEditor(); }}
        >
          <div className="card w-full max-w-sm shadow-2xl">
            <div className="flex items-start gap-2 px-4 py-3 border-b border-industrial-700">
              <div className="w-8 h-8 rounded-lg bg-accent-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white font-bold text-xs">%</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-industrial-500">{weightEditor.wbs}</span>
                </div>
                <h3 className="text-xs font-semibold text-white truncate mt-0.5" title={weightEditor.name}>
                  ตั้งค่า Main Weight
                </h3>
              </div>
              <button
                type="button"
                onClick={closeWeightEditor}
                className="btn-ghost p-1.5 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-400 mb-2">
                    น้ำหนักของ Main Activity (%)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-industrial-700 border border-industrial-600 rounded px-3 py-2 text-sm text-industrial-100 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20"
                    value={weightEditor.mainweight}
                    min={0}
                    max={100}
                    step={0.01}
                    onChange={(e) => updateWeightField(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="text-xs text-industrial-400 bg-industrial-800/50 rounded p-2">
                  <p><strong>หมายเหตุ:</strong> น้ำหนักที่แสดงจะคำนวณจาก:</p>
                  <p className="font-mono text-accent-400 mt-1">
                    แสดง = Main Weight × (ผลรวม Sub Weight / 100%)
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeWeightEditor}
                  className="btn-secondary text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={saveWeight}
                  className="btn-primary text-xs"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan date popup editor */}
      {dateEditor && (
        <div
          className="fixed inset-0 z-[155] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10,21,32,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDateEditor(); }}
        >
          <div className="card w-full max-w-md shadow-2xl">
            <div className="flex items-start gap-2 px-4 py-3 border-b border-industrial-700">
              <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-industrial-500">{dateEditor.wbs}</span>
                </div>
                <h3 className="text-xs font-semibold text-white truncate mt-0.5" title={dateEditor.name}>
                  กำหนดแผนเริ่ม / เสร็จ
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDateEditor}
                className="btn-ghost p-1.5 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-industrial-700">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <label className="block text-xs font-semibold text-green-400">
                      วันเริ่มแผน
                    </label>
                  </div>
                  <input
                    type="date"
                    className="w-full bg-industrial-700 border border-industrial-600 rounded px-3 py-2 text-xs text-industrial-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                    value={dateEditor.planStart}
                    onChange={(e) => updateDateField('planStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-industrial-700">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <label className="block text-xs font-semibold text-red-400">
                      วันเสร็จแผน
                    </label>
                  </div>
                  <input
                    type="date"
                    className="w-full bg-industrial-700 border border-industrial-600 rounded px-3 py-2 text-xs text-industrial-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    value={dateEditor.planFinish}
                    onChange={(e) => updateDateField('planFinish', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDateEditor}
                  className="btn-secondary text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={saveDates}
                  className="btn-primary text-xs inline-flex items-center gap-1"
                >
                  <Save size={13} />
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColHead({ label, width, flex, onResize }) {
  return (
    <div
      className={`px-2 pb-2 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider border-r border-industrial-700/50 last:border-r-0 ${flex ? 'flex-1 min-w-0' : 'shrink-0'}`}
      style={flex ? undefined : { width }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate">{label}</span>
        {!flex && onResize && (
          <span
            onMouseDown={onResize}
            className="w-1.5 h-5 cursor-col-resize bg-industrial-600/70 hover:bg-accent-500 rounded-full"
          />
        )}
      </div>
    </div>
  );
}
