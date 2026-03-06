import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useGanttTimeline } from '../hooks/useGanttTimeline';
import GanttTable from '../components/gantt/GanttTable';
import GanttTimeline from '../components/gantt/GanttTimeline';
import GanttScaleBar from '../components/gantt/GanttScaleBar';
import ActivityManagerModal from '../components/gantt/ActivityManagerModal';
import SCurveChart from '../components/gantt/SCurveChart';
import LookaheadView from '../components/gantt/LookaheadView';
import PrintDialog from '../components/gantt/PrintDialog';
import { BarChart2, AlertTriangle, CheckCircle } from 'lucide-react';

const ROW_HEIGHT = 40;

export default function GanttView() {
  const { selectedProject, activities, updateActivity, addActivity, deleteActivity, reorderSubActivities } = useApp();
  const [scale, setScale]               = useState('months');
  const [collapsed, setCollapsed]       = useState(new Set());
  const [showSCurve, setShowSCurve]         = useState(true);
  const [showLookahead, setShowLookahead]   = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  // ── Add activity modal state ───────────────────────────────────────────
  const [addModal, setAddModal] = useState({ open: false, mode: 'main', parentRow: null });

  // ── Delete confirm state ───────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // row to delete

  // ── Single scroll container ref (replaces two-pane sync) ───────────────
  const scrollContainerRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  // ── Collapse toggle ────────────────────────────────────────────────────
  const toggleCollapse = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Filtered project activities ────────────────────────────────────────
  const projectActivities = useMemo(
    () => activities.filter((a) => a.projectId === selectedProject?.id),
    [activities, selectedProject?.id]
  );

  // ── Main Activity weight total only (used by S-Curve + warning banner) ─────────
  const weightTotal = useMemo(() => {
    const mainActivities = projectActivities.filter((a) => !a.parentId);
    return +mainActivities.reduce((s, a) => s + (a.weight || 0), 0).toFixed(2);
  }, [projectActivities]);

  // ── Flat visible rows with hierarchy metadata ──────────────────────────
  const rows = useMemo(() => {
    if (!projectActivities.length) return [];

    const childMap = new Map();
    projectActivities.forEach((a) => {
      if (a.parentId) {
        if (!childMap.has(a.parentId)) childMap.set(a.parentId, []);
        childMap.get(a.parentId).push(a);
      }
    });

    const roots = projectActivities
      .filter((a) => !a.parentId)
      .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }));

    const result = [];
    function walk(node) {
      const kids = (childMap.get(node.id) || [])
        .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }));
      result.push({ ...node, _hasChildren: kids.length > 0 });
      if (!collapsed.has(node.id)) kids.forEach(walk);
    }
    roots.forEach(walk);
    return result;
  }, [projectActivities, collapsed]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleUpdate = useCallback((id, updates) => {
    updateActivity(id, updates);
  }, [updateActivity]);

  const handlePrint = useCallback(() => {
    setShowPrintDialog(true);
  }, []);

  // ── Add / Delete handlers ──────────────────────────────────────────────
  const handleAddMain = useCallback(() => {
    setAddModal({ open: true, mode: 'main', parentRow: null });
  }, []);

  const handleAddSub = useCallback((parentRow) => {
    setAddModal({ open: true, mode: 'sub', parentRow });
  }, []);

  const handleAddActivity = useCallback((data) => {
    addActivity({ ...data, projectId: selectedProject.id });
  }, [addActivity, selectedProject?.id]);

  const handleDeleteRequest = useCallback((row) => {
    setDeleteTarget(row);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      deleteActivity(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteActivity, deleteTarget]);

  const handleReorder = useCallback((parentId, orderedSubIds) => {
    reorderSubActivities(parentId, orderedSubIds);
  }, [reorderSubActivities]);

  // ── Timeline width measurement ────────────────────────────────────────
  useEffect(() => {
    const updateTimelineWidth = () => {
      if (timelineContainerRef.current) {
        const rect = timelineContainerRef.current.getBoundingClientRect();
        setTimelineWidth(rect.width);
      }
    };

    updateTimelineWidth();
    window.addEventListener('resize', updateTimelineWidth);
    return () => window.removeEventListener('resize', updateTimelineWidth);
  }, []);

  // ── Timeline math ──────────────────────────────────────────────────────
  const timeline = useGanttTimeline(projectActivities, scale, timelineWidth);

  // ── Empty states ───────────────────────────────────────────────────────
  if (!selectedProject) {
    return <EmptyState message="เลือกโครงการจากแถบด้านบน" />;
  }

  return (
    <>
      {/* ── Print Dialog + portalled PrintReport ────────────────── */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        project={selectedProject}
        activities={projectActivities}
        scale={scale}
      />

      {/* ── Add Activity Modal ───────────────────────────────────── */}
      <ActivityManagerModal
        isOpen={addModal.open}
        mode={addModal.mode}
        parentActivity={addModal.parentRow}
        totalWeight={weightTotal}
        onAdd={handleAddActivity}
        onClose={() => setAddModal({ open: false, mode: 'main', parentRow: null })}
      />

      {/* ── Delete Confirm Dialog ────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10,21,32,0.9)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="card w-full max-w-sm shadow-2xl">
            <div className="flex items-start gap-3 px-5 py-4 border-b border-red-800/60">
              <div className="w-8 h-8 bg-red-700/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={15} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">ยืนยันการลบ</h3>
                <p className="text-xs text-industrial-300 mt-0.5">
                  <span className="font-mono text-industrial-400">{deleteTarget.wbs}</span>
                  {' '}{deleteTarget.name}
                </p>
                {!deleteTarget.parentId && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={9} />
                    Sub-activities ทั้งหมดภายใต้งานนี้จะถูกลบด้วย
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary text-xs">ยกเลิก</button>
              <button
                onClick={handleDeleteConfirm}
                className="text-xs px-3 py-1.5 rounded font-medium bg-red-700 hover:bg-red-600 text-white transition-colors inline-flex items-center gap-1.5"
              >
                ลบเลย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main on-screen layout ────────────────────────────────── */}
      <div className="no-print flex flex-col h-full">

        {/* Toolbar */}
        <GanttScaleBar
          scale={scale}
          onScale={setScale}
          projectName={selectedProject.name}
          showSCurve={showSCurve}
          onToggleSCurve={() => setShowSCurve((v) => !v)}
          showLookahead={showLookahead}
          onToggleLookahead={() => setShowLookahead((v) => !v)}
          onPrint={handlePrint}
        />

        {/* ── Weight banner (above both panes so rows stay aligned) ──── */}
        {(() => {
          const wt = +weightTotal.toFixed(2);
          const wtOk  = wt === 100;
          const wtOver = wt > 100;
          return wtOk ? (
            <div className="shrink-0 flex items-center gap-2 px-3 py-1 text-[10px] border-b border-green-900/40 bg-green-900/20 text-green-400">
              <CheckCircle size={10} className="shrink-0" />
              <span>% Weight รวม = 100% — ถูกต้อง S-Curve คำนวณได้แม่นยำ</span>
            </div>
          ) : (
            <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs border-b ${
              wtOver ? 'bg-red-900/40 border-red-700/60 text-red-300' : 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300'
            }`}>
              <AlertTriangle size={12} className="shrink-0" />
              <span className="flex-1">
                <strong>% Weight รวม = {wt}%</strong>
                {wtOver
                  ? ` — เกิน 100% อยู่ ${+(wt - 100).toFixed(2)}% S-Curve จะคำนวณผิดพลาด กรุณาปรับลด`
                  : ` — ยังขาดอยู่ ${+(100 - wt).toFixed(2)}% กรุณาเพิ่มหรือปรับ Weight ให้ครบ 100%`}
              </span>
            </div>
          );
        })()}

        {/* Lookahead replaces the split-pane when active */}
        {showLookahead ? (
          <div className="flex-1 min-h-0">
            <LookaheadView
              activities={projectActivities}
              projectName={selectedProject.name}
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">

            {/* ── Split layout: fixed table + scrollable timeline ── */}
            <div className="flex flex-1 min-h-0">
              {/* Fixed left table */}
              <div
                className="shrink-0 bg-industrial-900"
                style={{ width: 'clamp(520px, 35vw, 700px)' }}
              >
                <div className="overflow-y-auto h-full">
                  <GanttTable
                    rows={rows}
                    collapsed={collapsed}
                    onToggle={toggleCollapse}
                    onUpdate={handleUpdate}
                    onAddMain={handleAddMain}
                    onAddSub={handleAddSub}
                    onDelete={handleDeleteRequest}
                    onReorder={handleReorder}
                    weightTotal={weightTotal}
                    ROW_H={ROW_HEIGHT}
                  />
                </div>
              </div>

              {/* Scrollable timeline */}
              <div ref={timelineContainerRef} className="flex-1 min-w-0">
                <div ref={scrollContainerRef} className="overflow-auto h-full">
                  {projectActivities.length > 0 ? (
                    <GanttTimeline
                      columns={timeline.columns}
                      totalWidth={timeline.totalWidth}
                      rows={rows}
                      ROW_H={ROW_HEIGHT}
                      scale={scale}
                      dateToX={timeline.dateToX}
                      spanToWidth={timeline.spanToWidth}
                      pxPerDay={timeline.pxPerDay}
                      onUpdate={handleUpdate}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-xs text-industrial-500">
                      ยังไม่มีกิจกรรม — กดปุ่ม +Main เพื่อเริ่มต้น
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* S-Curve Chart */}
            {showSCurve && (
              <SCurveChart
                activities={projectActivities}
                scale={scale}
                projectName={selectedProject.name}
              />
            )}
          </div>
        )}

      </div>
    </>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-industrial-400">
      <BarChart2 size={44} className="mb-3 text-industrial-600" />
      <p className="text-sm text-industrial-300">{message}</p>
    </div>
  );
}
