import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc } from "firebase/firestore";

// Firebase config is injected at build time via VITE_FIREBASE_* env vars
// instead of a committed JSON file, so no key ever lives in the git repo.
// See .env.example for the required variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  // Fails loudly at build time rather than silently shipping a broken app
  console.error(
    "Missing Firebase config — make sure VITE_FIREBASE_* env vars are set (see .env.example)."
  );
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// All collections for this workshop variant are prefixed with fow_
// so they can safely coexist with other ROAI Institute tools in the
// same Firebase project without colliding.
export const col = {
  workshops: collection(db, "fow_workshops"),
  participants: collection(db, "fow_participants"),
  surveyResponses: collection(db, "fow_survey_responses"),
  challenges: collection(db, "fow_challenges"),
  groups: collection(db, "fow_groups"),
  groupSolutions: collection(db, "fow_group_solutions"),
  boardChallenges: collection(db, "fow_board_challenges"),
  commitments: collection(db, "fow_commitments"),
};

export function docIn(collectionName: keyof typeof col, id?: string) {
  return id ? doc(db, (col[collectionName] as any).path, id) : doc(col[collectionName]);
}
