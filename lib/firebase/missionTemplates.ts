import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/firestore";
import { MissionTemplate } from "@/data/missionLibrary";
import { MissionCategory } from "@/types/wellness";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
}

/** 관리자가 엑셀/워드에서 추출해 업로드한 미션 템플릿 1건 */
export interface UploadedMissionTemplate extends MissionTemplate {
  source: "xlsx" | "docx";
  createdByUid: string;
  createdAt: number;
}

export type NewMissionTemplateInput = Omit<MissionTemplate, "id"> & {
  source: "xlsx" | "docx";
};

function mapTemplate(snap: QueryDocumentSnapshot<DocumentData>): UploadedMissionTemplate {
  const data = snap.data();
  return {
    id: snap.id,
    category: data.category,
    name: data.name,
    difficulty: data.difficulty,
    purposeTags: data.purposeTags ?? [],
    why: data.why,
    how: data.how,
    caution: data.caution,
    emoji: data.emoji ?? undefined,
    source: data.source,
    createdByUid: data.createdByUid,
    createdAt: toMillis(data.createdAt),
  };
}

/** 커리큘럼 생성 시 누구나 읽을 수 있어야(관리자 업로드분도 반영되도록) 한다 */
export async function listMissionTemplates(): Promise<UploadedMissionTemplate[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, "missionTemplates"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(mapTemplate);
}

/** analyzeDog()가 바로 merge할 수 있도록 카테고리별로 묶어준다 */
export function groupTemplatesByCategory(
  templates: MissionTemplate[]
): Record<MissionCategory, MissionTemplate[]> {
  const grouped: Record<MissionCategory, MissionTemplate[]> = {
    교육: [],
    운동: [],
    생활관리: [],
  };
  for (const template of templates) {
    grouped[template.category].push(template);
  }
  return grouped;
}

const BATCH_CHUNK_SIZE = 400;

/** 엑셀/워드에서 뽑아낸 여러 건을 한 번에 저장한다(쓰기는 관리자만 허용된다) */
export async function createMissionTemplatesBatch(
  templates: NewMissionTemplateInput[],
  createdByUid: string
): Promise<void> {
  const db = getFirestoreDb();
  for (let i = 0; i < templates.length; i += BATCH_CHUNK_SIZE) {
    const chunk = templates.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const template of chunk) {
      const ref = doc(collection(db, "missionTemplates"));
      batch.set(ref, {
        category: template.category,
        name: template.name,
        difficulty: template.difficulty,
        purposeTags: template.purposeTags,
        why: template.why,
        how: template.how,
        caution: template.caution,
        emoji: template.emoji ?? null,
        source: template.source,
        createdByUid,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

export async function deleteMissionTemplate(templateId: string): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, "missionTemplates", templateId));
}
