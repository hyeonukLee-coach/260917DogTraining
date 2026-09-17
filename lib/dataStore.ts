import { DogProfile, GeneratedCurriculum } from "@/types/curriculum";

/**
 * 브라우저 localStorage를 이용한 저장소 계층.
 * 추후 서버 API로 교체할 때 이 파일의 함수 시그니처만 유지하면 된다.
 */

const STORAGE_KEYS = {
  PROFILE: "dog-curriculum:profile",
  CURRICULUM: "dog-curriculum:curriculum",
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

export function saveDogProfile(profile: DogProfile): void {
  writeJSON(STORAGE_KEYS.PROFILE, profile);
}

export function getDogProfile(): DogProfile | null {
  return readJSON<DogProfile>(STORAGE_KEYS.PROFILE);
}

export function saveCurriculum(curriculum: GeneratedCurriculum): void {
  writeJSON(STORAGE_KEYS.CURRICULUM, curriculum);
}

export function getCurriculum(): GeneratedCurriculum | null {
  return readJSON<GeneratedCurriculum>(STORAGE_KEYS.CURRICULUM);
}

export function clearAll(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEYS.PROFILE);
  window.localStorage.removeItem(STORAGE_KEYS.CURRICULUM);
}
