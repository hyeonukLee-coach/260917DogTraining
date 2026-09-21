import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/firestore";
import { AdminNote } from "@/types/admin";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
}

function mapNote(snap: QueryDocumentSnapshot<DocumentData>): AdminNote {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    content: data.content,
    authorUid: data.authorUid,
    authorEmail: data.authorEmail,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export async function listAdminNotes(): Promise<AdminNote[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, "adminNotes"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(mapNote);
}

export interface CreateAdminNoteInput {
  authorUid: string;
  authorEmail: string;
  title: string;
  content: string;
}

export async function createAdminNote(input: CreateAdminNoteInput): Promise<string> {
  const db = getFirestoreDb();
  const ref = await addDoc(collection(db, "adminNotes"), {
    title: input.title,
    content: input.content,
    authorUid: input.authorUid,
    authorEmail: input.authorEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAdminNote(
  noteId: string,
  fields: { title: string; content: string }
): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, "adminNotes", noteId), {
    title: fields.title,
    content: fields.content,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAdminNote(noteId: string): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, "adminNotes", noteId));
}
