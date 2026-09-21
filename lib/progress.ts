import { Curriculum, MissionRecord } from "@/types/wellness";

/**
 * 날짜/진행률 계산 유틸.
 * 모든 날짜는 "YYYY-MM-DD" 문자열로 다루고, 내부 연산은 UTC 자정 기준으로
 * 처리해 타임존/DST에 흔들리지 않게 한다. "오늘"만 로컬 시각 기준으로 구한다.
 */

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateString(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function toUtcMs(dateStr: string): number {
  const { y, m, d } = parseDateString(dateStr);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  const date = new Date(ms);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(dateStr: string, days: number): string {
  return fromUtcMs(toUtcMs(dateStr) + days * ONE_DAY_MS);
}

export function diffDays(fromStr: string, toStr: string): number {
  return Math.round((toUtcMs(toStr) - toUtcMs(fromStr)) / ONE_DAY_MS);
}

/** 커리큘럼이 시작된 날짜(1일차) 기준으로, 그 일차의 미션을 인증해야 하는 날짜 */
export function missionDueDate(startDate: string, day: number): string {
  return addDays(startDate, day - 1);
}

/** 오늘이 커리큘럼의 며칠 차에 해당하는지 (범위를 벗어나면 1 또는 totalDays로 자른다) */
export function currentCurriculumDay(
  curriculum: Curriculum,
  today: string = getLocalDateString()
): number {
  const day = diffDays(curriculum.startDate, today) + 1;
  return Math.min(Math.max(day, 1), curriculum.totalDays);
}

export function findMissionRecord(
  records: MissionRecord[],
  missionId: string,
  dateStr: string
): MissionRecord | undefined {
  return records.find((r) => r.missionId === missionId && r.date === dateStr);
}

/** 그 일차에 배정된 미션을 모두 완료했는지 (완료 기록은 그 일차의 인증 예정일 기준으로 찾는다) */
export function getDayCompletion(
  curriculum: Curriculum,
  day: number,
  records: MissionRecord[]
): boolean {
  const curriculumDay = curriculum.days.find((d) => d.day === day);
  if (!curriculumDay || curriculumDay.items.length === 0) return false;
  const dueDate = missionDueDate(curriculum.startDate, day);
  return curriculumDay.items.every(
    (item) => findMissionRecord(records, item.id, dueDate)?.completed === true
  );
}

/** 인증 완료 / 미인증(기한이 지났는데 완료 안 함) / 오늘 진행 중 / 아직 오지 않음 */
export type DayCertStatus = "completed" | "uncertified" | "today" | "upcoming";

export function getDayStatus(
  curriculum: Curriculum,
  day: number,
  records: MissionRecord[],
  today: string = getLocalDateString()
): DayCertStatus {
  if (getDayCompletion(curriculum, day, records)) return "completed";
  const dueDate = missionDueDate(curriculum.startDate, day);
  const daysPastDue = diffDays(dueDate, today);
  if (daysPastDue > 0) return "uncertified";
  if (daysPastDue === 0) return "today";
  return "upcoming";
}

export interface CurriculumStats {
  totalDays: number;
  /** 오늘까지 인증 기한이 도래한 일차 수 (아직 오지 않은 일차는 제외) */
  dueDaysCount: number;
  completedCount: number;
  uncertifiedCount: number;
  /** 0~100 정수, dueDaysCount 기준 */
  achievementRate: number;
  /** 0~100 정수, dueDaysCount 기준 */
  uncertifiedRate: number;
  /** 가장 최근 일차부터 거꾸로 센 연속 인증일수 */
  currentStreak: number;
}

/** 소유자·관리자만 보는 통계: 미션 달성률, 미인증률, 연속 인증일수 */
export function computeCurriculumStats(
  curriculum: Curriculum,
  records: MissionRecord[],
  today: string = getLocalDateString()
): CurriculumStats {
  let dueDaysCount = 0;
  let completedCount = 0;
  let uncertifiedCount = 0;

  for (const curriculumDay of curriculum.days) {
    const status = getDayStatus(curriculum, curriculumDay.day, records, today);
    if (status === "upcoming") continue;
    dueDaysCount++;
    if (status === "completed") completedCount++;
    if (status === "uncertified") uncertifiedCount++;
  }

  const achievementRate = dueDaysCount === 0 ? 0 : Math.round((completedCount / dueDaysCount) * 100);
  const uncertifiedRate = dueDaysCount === 0 ? 0 : Math.round((uncertifiedCount / dueDaysCount) * 100);

  let currentStreak = 0;
  for (let day = curriculum.totalDays; day >= 1; day--) {
    const status = getDayStatus(curriculum, day, records, today);
    if (status === "upcoming" || status === "today") continue;
    if (status === "completed") {
      currentStreak++;
      continue;
    }
    break; // uncertified를 만나면 연속 기록이 끊긴다
  }

  return {
    totalDays: curriculum.totalDays,
    dueDaysCount,
    completedCount,
    uncertifiedCount,
    achievementRate,
    uncertifiedRate,
    currentStreak,
  };
}
