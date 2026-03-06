import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, GitBranch, GripVertical } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { th } from 'date-fns/locale';

const ROW_HEIGHT = 52;

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
  ROW_H = ROW_HEIGHT,
}) {
  // ── Drag-and-drop state (sub activities only) ─────────────────────────
  const dragId   = useRef(null);   // id of the row being dragged
  const dragParent = useRef(null); // parentId of the dragged row
  const [dragOverId, setDragOverId] = useState(null); // id of the row currently hovered

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

  return (
    <div className="shrink-0 border-r border-industrial-600 flex flex-col select-none" style={{ minWidth: 460 }}>

      {/* ── Column Header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 bg-industrial-800 border-b border-industrial-600"
        style={{ height: 56 }}
      >
        <div className="flex h-full items-end">
          <ColHead label="WBS"          width={52}  />
          <ColHead label="ชื่องาน"      flex        />
          <ColHead label="น้ำหนัก"      width={58}  />
          <ColHead label="แผนเริ่ม"     width={80}  />
          <ColHead label="แผนเสร็จ"     width={80}  />
          <ColHead label="ความก้าวหน้า" width={90}  />
          {/* actions column */}
          <div className="shrink-0 flex items-end justify-center pb-2" style={{ width: 64 }}>
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
              onClick={() => onEdit && onEdit(row)}
            >
              {/* WBS */}
              <div
                className="shrink-0 flex items-center justify-center text-[10px] font-mono text-industrial-400"
                style={{ width: 52 }}
              >
                {row.wbs}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0 flex items-center gap-1 pr-1">
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
                className="shrink-0 text-center text-xs font-mono text-industrial-300"
                style={{ width: 58 }}
              >
                {(+row.weight).toFixed(2)}%
              </div>

              {/* Plan Start */}
              <div className="shrink-0 text-center text-[10px] font-mono text-industrial-400" style={{ width: 80 }}>
                {fmt(row.planStart)}
              </div>

              {/* Plan Finish */}
              <div className="shrink-0 text-center text-[10px] font-mono text-industrial-400" style={{ width: 80 }}>
                {fmt(row.planFinish)}
              </div>

              {/* Progress */}
              <div className="shrink-0 flex items-center gap-1.5 px-2" style={{ width: 90 }}>
                <div className="flex-1 bg-industrial-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(row.progress)}`}
                    style={{ width: `${row.progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-industrial-300 w-7 text-right">
                  {row.progress}%
                </span>
              </div>

              {/* Row actions */}
              <div
                className="shrink-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ width: 64 }}
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
    </div>
  );
}

function ColHead({ label, width, flex }) {
  return (
    <div
      className={`px-2 pb-2 text-[10px] font-semibold text-industrial-400 uppercase tracking-wider border-r border-industrial-700/50 last:border-r-0 ${flex ? 'flex-1 min-w-0' : 'shrink-0'}`}
      style={flex ? undefined : { width }}
    >
      {label}
    </div>
  );
}
