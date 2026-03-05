/**
 * seedFirebase.js
 * Run once to push mockData into Firestore.
 * Usage: node src/scripts/seedFirebase.js
 *
 * Requires: firebase-admin  (npm install -D firebase-admin)
 * Or run via the in-app seed button in ProjectsView (see seedToFirestore export below).
 *
 * Firestore structure:
 *   CMGProjectPlanner (collection)
 *   └── root (document)
 *         ├── projects (subcollection)
 *         │     └── {project.id} (document)
 *         └── activities (subcollection)
 *               └── {activity.id} (document)
 */

import { db } from '../firebase.js';
import {
  collection, doc, setDoc, writeBatch,
} from 'firebase/firestore';
import { INITIAL_PROJECTS, INITIAL_ACTIVITIES } from '../data/mockData.js';

const ROOT_COL  = 'CMGProjectPlanner';
const ROOT_DOC  = 'root';

/**
 * Seed all mock projects + activities into Firestore.
 * Uses batched writes (max 500 per batch; mock data is well under that).
 * Returns a Promise that resolves when done.
 */
export async function seedToFirestore() {
  const batch = writeBatch(db);

  // Ensure root document exists
  const rootRef = doc(db, ROOT_COL, ROOT_DOC);
  batch.set(rootRef, { seededAt: new Date().toISOString() }, { merge: true });

  // ── Projects ──────────────────────────────────────────────────────────────
  INITIAL_PROJECTS.forEach((project) => {
    const ref = doc(collection(rootRef, 'projects'), project.id);
    batch.set(ref, project);
  });

  // ── Activities ────────────────────────────────────────────────────────────
  INITIAL_ACTIVITIES.forEach((activity) => {
    const ref = doc(collection(rootRef, 'activities'), activity.id);
    batch.set(ref, activity);
  });

  await batch.commit();
  console.log(
    `✅ Seeded ${INITIAL_PROJECTS.length} projects and ${INITIAL_ACTIVITIES.length} activities into Firestore.`
  );
}
