import { VideoProgramState } from "@/types/community";
import {
  CourseActivation,
  Dog,
  MissionRecord,
  User,
  WellnessPlan,
} from "@/types/wellness";

/**
 * 브라우저 localStorage를 이용한 저장소 계층.
 * 추후 서버 API로 교체할 때 이 파일의 함수 시그니처만 유지하면 된다.
 */

const STORAGE_KEYS = {
  USER: "unipaws:user",
  DOG: "unipaws:dog",
  PLAN: "unipaws:plan",
  ACTIVATIONS: "unipaws:activations",
  RECORDS: "unipaws:records",
  GEMINI_API_KEY: "unipaws:gemini-api-key",
  VIDEO_PROGRAMS: "unipaws:video-programs",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 사용이 불가능한 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

export function generateId(): string {
  if (isBrowser() && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 로그인 없는 로컬 사용자. 최초 방문 시 한 번 생성되어 계속 재사용된다 */
export function getOrCreateUser(): User {
  const existing = readJSON<User>(STORAGE_KEYS.USER);
  if (existing) return existing;
  const user: User = { id: generateId(), createdAt: new Date().toISOString() };
  writeJSON(STORAGE_KEYS.USER, user);
  return user;
}

export function saveDog(dog: Dog): void {
  writeJSON(STORAGE_KEYS.DOG, dog);
}

export function getDog(): Dog | null {
  return readJSON<Dog>(STORAGE_KEYS.DOG);
}

export function savePlan(plan: WellnessPlan): void {
  writeJSON(STORAGE_KEYS.PLAN, plan);
}

export function getPlan(): WellnessPlan | null {
  return readJSON<WellnessPlan>(STORAGE_KEYS.PLAN);
}

export function saveActivations(activations: CourseActivation[]): void {
  writeJSON(STORAGE_KEYS.ACTIVATIONS, activations);
}

export function getActivations(): CourseActivation[] {
  return readJSON<CourseActivation[]>(STORAGE_KEYS.ACTIVATIONS) ?? [];
}

export function saveMissionRecords(records: MissionRecord[]): void {
  writeJSON(STORAGE_KEYS.RECORDS, records);
}

export function getMissionRecords(): MissionRecord[] {
  return readJSON<MissionRecord[]>(STORAGE_KEYS.RECORDS) ?? [];
}

/** courseId를 키로 하는 영상 프로그램 진행 상태 저장소 */
export function saveVideoProgramState(courseId: string, state: VideoProgramState): void {
  const all = readJSON<Record<string, VideoProgramState>>(STORAGE_KEYS.VIDEO_PROGRAMS) ?? {};
  all[courseId] = state;
  writeJSON(STORAGE_KEYS.VIDEO_PROGRAMS, all);
}

export function getVideoProgramState(courseId: string): VideoProgramState | null {
  const all = readJSON<Record<string, VideoProgramState>>(STORAGE_KEYS.VIDEO_PROGRAMS) ?? {};
  return all[courseId] ?? null;
}

export function clearAll(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEYS.DOG);
  window.localStorage.removeItem(STORAGE_KEYS.PLAN);
  window.localStorage.removeItem(STORAGE_KEYS.ACTIVATIONS);
  window.localStorage.removeItem(STORAGE_KEYS.RECORDS);
  window.localStorage.removeItem(STORAGE_KEYS.VIDEO_PROGRAMS);
}

/**
 * Gemini API 키는 사용자의 브라우저에만 저장되며, 저장/조회 시 서버로 전송되지 않는다.
 * 실제 AI 호출 시에도 이 키는 Google API로 직접 전달될 뿐 우리 서버를 거치지 않는다.
 */
export function saveGeminiApiKey(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key);
  } catch {
    // 저장 실패 시 조용히 무시한다.
  }
}

export function getGeminiApiKey(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
  } catch {
    return null;
  }
}

export function clearGeminiApiKey(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
}
