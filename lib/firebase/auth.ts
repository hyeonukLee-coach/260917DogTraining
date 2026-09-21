import {
  Auth,
  GoogleAuthProvider,
  User as FirebaseUser,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseApp } from "@/lib/firebase/config";
import { getFirestoreDb } from "@/lib/firebase/firestore";
import { UserProfile } from "@/types/community";

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/**
 * 로그인 시 users/{uid} 문서를 만들거나 표시 정보만 갱신한다.
 * isTrainer는 최초 생성 시에만 false로 설정하고, 이후 로그인에서는 절대 건드리지
 * 않는다(훈련사 배지는 Firebase 콘솔에서 운영자가 직접 부여/해제).
 */
export async function ensureUserProfile(user: FirebaseUser): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName ?? "익명의 보호자",
      photoURL: user.photoURL ?? null,
      isTrainer: false,
      createdAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(
    ref,
    {
      displayName: user.displayName ?? "익명의 보호자",
      photoURL: user.photoURL ?? null,
    },
    { merge: true }
  );
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirestoreDb();
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid,
    displayName: data.displayName ?? "익명의 보호자",
    photoURL: data.photoURL ?? undefined,
    isTrainer: data.isTrainer === true,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}
