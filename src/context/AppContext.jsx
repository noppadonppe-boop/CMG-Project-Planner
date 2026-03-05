import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  collection, doc, setDoc, updateDoc,
  onSnapshot, writeBatch, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

const ROOT_COL = 'CMGProjectPlanner';
const ROOT_DOC = 'root';

function rootRef()      { return doc(db, ROOT_COL, ROOT_DOC); }
function projectsCol()  { return collection(rootRef(), 'projects'); }
function activitiesCol(){ return collection(rootRef(), 'activities'); }

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [projects, setProjects]             = useState([]);
  const [activities, setActivities]         = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [activeView, setActiveView]         = useState('gantt');
  const [isManualOpen, setIsManualOpen]     = useState(false);
  const [loading, setLoading]               = useState(true);

  // ── Realtime listeners ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let projLoaded = false;
    let actLoaded  = false;

    const checkDone = () => {
      if (projLoaded && actLoaded) setLoading(false);
    };

    const unsubProjects = onSnapshot(projectsCol(), (snap) => {
      const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      setProjects(data);
      setSelectedProjectId((prev) => {
        if (prev && data.find((p) => p.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
      projLoaded = true;
      checkDone();
    });

    const unsubActivities = onSnapshot(activitiesCol(), (snap) => {
      const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      setActivities(data);
      actLoaded = true;
      checkDone();
    });

    return () => {
      unsubProjects();
      unsubActivities();
    };
  }, []);

  // ── Project CRUD ────────────────────────────────────────────────────────────────────────────────────

  const addProject = useCallback(async (project) => {
    const id = `proj-${Date.now()}`;
    const newProject = { ...project, id };
    await setDoc(doc(projectsCol(), id), newProject);
    return id;
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    await updateDoc(doc(projectsCol(), id), updates);
  }, []);

  const deleteProject = useCallback(async (id) => {
    const batch = writeBatch(db);
    // Delete the project document
    batch.delete(doc(projectsCol(), id));
    // Delete all activities belonging to this project
    const snap = await getDocs(activitiesCol());
    snap.docs
      .filter((d) => d.data().projectId === id)
      .forEach((d) => batch.delete(d.ref));
    await batch.commit();
    setSelectedProjectId((current) =>
      current === id ? (projects.find((p) => p.id !== id)?.id ?? null) : current
    );
  }, [projects]);

  const cloneProject = useCallback(async (sourceId) => {
    const source = projects.find((p) => p.id === sourceId);
    if (!source) return;

    const newProjId = `proj-${Date.now()}`;
    const newProject = {
      ...source,
      id: newProjId,
      name: `${source.name} (สำเนา)`,
      status: 'planning',
    };

    const sourceActivities = activities.filter((a) => a.projectId === sourceId);
    const idMap = {};
    const newActivities = sourceActivities.map((a) => {
      const newId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      idMap[a.id] = newId;
      return { ...a, id: newId, projectId: newProjId };
    });
    // Re-map parentIds
    const remapped = newActivities.map((a) => ({
      ...a,
      parentId: a.parentId ? (idMap[a.parentId] ?? null) : null,
    }));

    const batch = writeBatch(db);
    batch.set(doc(projectsCol(), newProjId), newProject);
    remapped.forEach((act) => batch.set(doc(activitiesCol(), act.id), act));
    await batch.commit();
    setSelectedProjectId(newProjId);
  }, [projects, activities]);

  // ── Activity CRUD ─────────────────────────────────────────────────────────────────────────────

  const addActivity = useCallback(async (activity) => {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Compute new WBS locally first for immediate feedback
    const projected = reWBS([...activities, { ...activity, id }], activity.projectId);
    // Write all re-numbered activities for this project in one batch
    const batch = writeBatch(db);
    projected
      .filter((a) => a.projectId === activity.projectId)
      .forEach((a) => batch.set(doc(activitiesCol(), a.id), a));
    await batch.commit();
    return id;
  }, [activities]);

  const updateActivity = useCallback(async (id, updates) => {
    // Compute roll-up locally
    const updated = activities.map((a) => (a.id === id ? { ...a, ...updates } : a));
    const changedActivity = updated.find((a) => a.id === id);
    const final = changedActivity?.parentId
      ? rollUpParent(updated, changedActivity.parentId)
      : updated;

    // Write only changed documents
    const batch = writeBatch(db);
    final.forEach((a, i) => {
      const orig = activities[i];
      if (JSON.stringify(a) !== JSON.stringify(activities.find((x) => x.id === a.id))) {
        batch.set(doc(activitiesCol(), a.id), a);
      }
    });
    await batch.commit();
  }, [activities]);

  const deleteActivity = useCallback(async (id) => {
    const act = activities.find((a) => a.id === id);
    const projectId = act?.projectId;
    // Collect target + all descendants
    const toDelete = new Set();
    const collectChildren = (targetId) => {
      toDelete.add(targetId);
      activities.filter((a) => a.parentId === targetId).forEach((c) => collectChildren(c.id));
    };
    collectChildren(id);
    const filtered = activities.filter((a) => !toDelete.has(a.id));
    const renumbered = projectId ? reWBS(filtered, projectId) : filtered;

    const batch = writeBatch(db);
    toDelete.forEach((delId) => batch.delete(doc(activitiesCol(), delId)));
    renumbered
      .filter((a) => a.projectId === projectId)
      .forEach((a) => batch.set(doc(activitiesCol(), a.id), a));
    await batch.commit();
  }, [activities]);

  const setProjectActivities = useCallback(async (projectId, newActivities) => {
    // Replace all activities for this project in one batch
    const oldSnap = await getDocs(activitiesCol());
    const batch = writeBatch(db);
    oldSnap.docs
      .filter((d) => d.data().projectId === projectId)
      .forEach((d) => batch.delete(d.ref));
    newActivities.forEach((a) => batch.set(doc(activitiesCol(), a.id), a));
    await batch.commit();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────────────────────────

  const getProjectActivities = useCallback(
    (projectId) => activities.filter((a) => a.projectId === projectId),
    [activities]
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const value = {
    projects,
    activities,
    selectedProjectId,
    selectedProject,
    activeView,
    isManualOpen,

    setSelectedProjectId,
    setActiveView,
    setIsManualOpen,

    addProject,
    updateProject,
    deleteProject,
    cloneProject,

    addActivity,
    updateActivity,
    deleteActivity,
    setProjectActivities,
    getProjectActivities,
    loading,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-industrial-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-industrial-300">กำลังโหลดข้อมูลจาก Firebase…</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ── WBS renumber helper (pure) ────────────────────────────────────────────
// Rebuilds WBS numbers for all activities of a project while preserving
// parent-child relationships and the original sort order.

function reWBS(allActivities, projectId) {
  const proj = allActivities.filter((a) => a.projectId === projectId);
  const other = allActivities.filter((a) => a.projectId !== projectId);

  // Build child map
  const childMap = new Map();
  proj.forEach((a) => {
    const key = a.parentId ?? '__root__';
    if (!childMap.has(key)) childMap.set(key, []);
    childMap.get(key).push(a);
  });

  const result = [];

  function walk(parentId, prefix) {
    const key = parentId ?? '__root__';
    const kids = (childMap.get(key) || []).slice().sort((a, b) =>
      // Sort by current WBS numerically so relative order is preserved
      a.wbs.localeCompare(b.wbs, undefined, { numeric: true })
    );
    kids.forEach((child, idx) => {
      const newWbs = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      result.push({ ...child, wbs: newWbs });
      walk(child.id, newWbs);
    });
  }

  walk(null, '');
  return [...other, ...result];
}

// ── Roll-up helper (pure) ─────────────────────────────────────────────────

function rollUpParent(allActivities, parentId) {
  const children = allActivities.filter((a) => a.parentId === parentId);
  if (children.length === 0) return allActivities;

  const planStarts = children.map((c) => c.planStart).filter(Boolean).sort();
  const planFinishes = children.map((c) => c.planFinish).filter(Boolean).sort();
  const actualStarts = children.map((c) => c.actualStart).filter(Boolean).sort();
  const actualFinishes = children.map((c) => c.actualFinish).filter(Boolean).sort();

  const allActualFinished = children.every((c) => c.actualFinish);

  const updated = allActivities.map((a) => {
    if (a.id !== parentId) return a;
    return {
      ...a,
      planStart: planStarts[0] ?? a.planStart,
      planFinish: planFinishes[planFinishes.length - 1] ?? a.planFinish,
      actualStart: actualStarts[0] ?? a.actualStart,
      actualFinish: allActualFinished
        ? actualFinishes[actualFinishes.length - 1]
        : null,
    };
  });

  // Recurse up the tree
  const parent = updated.find((a) => a.id === parentId);
  if (parent?.parentId) return rollUpParent(updated, parent.parentId);
  return updated;
}
