import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

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
  groupSignups: collection(db, "fow_group_signups"),
  groups: collection(db, "fow_groups"),
  groupSolutions: collection(db, "fow_group_solutions"),
  boardChallenges: collection(db, "fow_board_challenges"),
  commitments: collection(db, "fow_commitments"),
};

export function docIn(collectionName: keyof typeof col, id?: string) {
  return id ? doc(db, (col[collectionName] as any).path, id) : doc(col[collectionName]);
}
