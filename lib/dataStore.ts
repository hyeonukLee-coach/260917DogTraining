import { VideoProgramState } from "@/types/community";
import { DogPhotoMap } from "@/types/wellness";

/**
 * 브라우저 localStorage를 이용한 로컬 전용 저장소.
 * 강아지·커리큘럼·미션기록은 이제 계정(Firestore)에 저장되므로(lib/firebase/dogs.ts),
 * 여기에는 서버로 보내지 않는 편이 나은 것들만 남긴다: Gemini API 키, 반려견 사진,
 * 교육 영상 프로그램 시청 진행 상태.
 */

const STORAGE_KEYS = {
  DOG_PHOTOS: "unipaws:dog-photos",
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

/**
 * 반려견 사진은 Firestore 문서 용량 부담과 Storage 미사용 방침 때문에
 * 계정에 동기화하지 않고 이 브라우저에만 dogId로 붙여둔다.
 */
export function saveDogPhoto(dogId: string, dataUrl: string): void {
  const all = readJSON<DogPhotoMap>(STORAGE_KEYS.DOG_PHOTOS) ?? {};
  all[dogId] = dataUrl;
  writeJSON(STORAGE_KEYS.DOG_PHOTOS, all);
}

export function removeDogPhoto(dogId: string): void {
  const all = readJSON<DogPhotoMap>(STORAGE_KEYS.DOG_PHOTOS) ?? {};
  delete all[dogId];
  writeJSON(STORAGE_KEYS.DOG_PHOTOS, all);
}

export function getDogPhoto(dogId: string): string | undefined {
  const all = readJSON<DogPhotoMap>(STORAGE_KEYS.DOG_PHOTOS) ?? {};
  return all[dogId];
}

/** dogId를 키로 하는 영상 프로그램 진행 상태 저장소 */
export function saveVideoProgramState(dogId: string, state: VideoProgramState): void {
  const all = readJSON<Record<string, VideoProgramState>>(STORAGE_KEYS.VIDEO_PROGRAMS) ?? {};
  all[dogId] = state;
  writeJSON(STORAGE_KEYS.VIDEO_PROGRAMS, all);
}

export function getVideoProgramState(dogId: string): VideoProgramState | null {
  const all = readJSON<Record<string, VideoProgramState>>(STORAGE_KEYS.VIDEO_PROGRAMS) ?? {};
  return all[dogId] ?? null;
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
