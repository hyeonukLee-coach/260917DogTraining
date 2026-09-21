import { Firestore, getFirestore } from "firebase/firestore";

import { getFirebaseApp } from "@/lib/firebase/config";

let dbInstance: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}
