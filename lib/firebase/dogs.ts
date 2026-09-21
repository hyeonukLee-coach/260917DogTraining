import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/firestore";
import { Curriculum, Dog, MissionRecord } from "@/types/wellness";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
}

function mapDog(snap: QueryDocumentSnapshot<DocumentData>): Dog {
  const data = snap.data();
  return {
    id: snap.id,
    ownerUid: data.ownerUid,
    name: data.name,
    birthDate: data.birthDate ?? undefined,
    ageYears: data.ageYears ?? undefined,
    breed: data.breed,
    gender: data.gender ?? undefined,
    weightKg: data.weightKg ?? undefined,
    neutered: data.neutered ?? undefined,
    healthConditions: data.healthConditions ?? undefined,
    activityLevel: data.activityLevel ?? undefined,
    dailyWalkMinutes: data.dailyWalkMinutes ?? undefined,
    behaviorConcerns: data.behaviorConcerns ?? undefined,
    physicalConcerns: data.physicalConcerns ?? undefined,
    goals: data.goals ?? [],
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export type CreateDogInput = Omit<Dog, "id" | "createdAt" | "updatedAt">;

export async function createDog(input: CreateDogInput): Promise<string> {
  const db = getFirestoreDb();
  const ref = await addDoc(collection(db, "dogs"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listDogsByOwner(ownerUid: string): Promise<Dog[]> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, "dogs"),
    where("ownerUid", "==", ownerUid),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapDog);
}

export async function getDog(dogId: string): Promise<Dog | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "dogs", dogId));
  if (!snap.exists()) return null;
  return mapDog(snap as QueryDocumentSnapshot<DocumentData>);
}

function mapCurriculum(dogId: string, data: DocumentData): Curriculum {
  return {
    id: "current",
    dogId,
    weeks: data.weeks,
    totalDays: data.totalDays,
    startDate: data.startDate,
    currentStateSummary: data.currentStateSummary,
    goals: data.goals ?? [],
    priorityAreas: data.priorityAreas ?? [],
    summary: data.summary,
    needsVetNotice: data.needsVetNotice === true,
    source: data.source,
    days: data.days ?? [],
    createdAt: toMillis(data.createdAt),
  };
}

/**
 * 강아지마다 커리큘럼은 하나만 유지한다(다시 만들면 덮어쓴다).
 * ownerUid를 문서에 함께 저장해, 보안 규칙이 상위 dogs 문서를 다시 조회하지
 * 않고도(추가 읽기 비용 없이) 바로 소유자를 확인할 수 있게 한다.
 */
export async function saveCurriculum(
  dogId: string,
  ownerUid: string,
  curriculum: Omit<Curriculum, "id" | "dogId" | "createdAt">
): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(doc(db, "dogs", dogId, "curriculum", "current"), {
    ...curriculum,
    ownerUid,
    createdAt: serverTimestamp(),
  });
}

export async function getCurriculum(dogId: string): Promise<Curriculum | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "dogs", dogId, "curriculum", "current"));
  if (!snap.exists()) return null;
  return mapCurriculum(dogId, snap.data());
}

function mapMissionRecord(snap: QueryDocumentSnapshot<DocumentData>): MissionRecord {
  const data = snap.data();
  return {
    id: snap.id,
    dogId: data.dogId,
    missionId: data.missionId,
    date: data.date,
    completed: data.completed === true,
    completedAt: data.completedAt ? toMillis(data.completedAt) : undefined,
  };
}

export async function listMissionRecords(dogId: string): Promise<MissionRecord[]> {
  const db = getFirestoreDb();
  const snap = await getDocs(collection(db, "dogs", dogId, "missionRecords"));
  return snap.docs.map(mapMissionRecord);
}

/**
 * 미션 완료 상태를 하루 단위로 저장한다. 문서 id를 `${missionId}_${date}`로 고정해
 * 중복 기록 없이 덮어쓰기만으로 토글할 수 있게 한다.
 */
export async function setMissionRecord(
  dogId: string,
  ownerUid: string,
  missionId: string,
  date: string,
  completed: boolean
): Promise<void> {
  const db = getFirestoreDb();
  const recordId = `${missionId}_${date}`;
  await setDoc(doc(db, "dogs", dogId, "missionRecords", recordId), {
    dogId,
    ownerUid,
    missionId,
    date,
    completed,
    completedAt: completed ? serverTimestamp() : null,
  });
}
