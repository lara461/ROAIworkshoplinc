import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, doc, type Firestore, type CollectionReference, type DocumentData } from "firebase/firestore";

// Firebase is initialized lazily: the config is fetched from the server
// (which reads it from runtime env vars) instead of being baked into the
// JS bundle at build time. See server.ts's /api/firebase-config endpoint.
// This means the frontend can be built once, at image-build time, and every
// container start is a normal fast cold start.
export let app: FirebaseApp;
export let db: Firestore;
export const col: Record<string, CollectionReference<DocumentData>> = {};

let resolveReady: () => void;
export const firebaseReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export async function initFirebase() {
  const res = await fetch("/api/firebase-config");
  const config = await res.json();
  app = initializeApp(config);
  db = getFirestore(app);

  // All collections for this workshop variant are prefixed with fow_
  // so they can safely coexist with other ROAI Institute tools in the
  // same Firebase project without colliding.
  col.workshops = collection(db, "fow_workshops");
  col.participants = collection(db, "fow_participants");
  col.surveyResponses = collection(db, "fow_survey_responses");
  col.groups = collection(db, "fow_groups");
  col.challenges = collection(db, "fow_challenges");
  col.groupSolutions = collection(db, "fow_group_solutions");
  col.boardChallenges = collection(db, "fow_board_challenges");
  col.knowledgeDocs = collection(db, "fow_knowledge_docs");
  col.groupReports = collection(db, "fow_group_reports");

  resolveReady();
}

export function docIn(collectionName: string, id?: string) {
  return id ? doc(db, (col[collectionName] as any).path, id) : doc(col[collectionName]);
}
