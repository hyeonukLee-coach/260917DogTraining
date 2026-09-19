import { CourseActivation, Mission, MissionRecord, RecommendedCourse } from "@/types/wellness";

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

export function startOfWeek(dateStr: string): string {
  const ms = toUtcMs(dateStr);
  const dayOfWeek = new Date(ms).getUTCDay(); // 0=일 ... 6=토
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return fromUtcMs(ms - diffToMonday * ONE_DAY_MS);
}

/** 코스 활성화 시점 기준으로, 주어진 날짜가 코스의 며칠 차인지 (1부터 시작) */
export function courseDueDay(activation: CourseActivation, dateStr: string): number {
  return diffDays(activation.startDate, dateStr) + 1;
}

export interface TodayMissionEntry {
  course: RecommendedCourse;
  mission: Mission;
  record?: MissionRecord;
}

export function findMissionRecord(
  records: MissionRecord[],
  missionId: string,
  dateStr: string
): MissionRecord | undefined {
  return records.find((r) => r.missionId === missionId && r.date === dateStr);
}

/** 특정 날짜에 활성화된 코스들에서 진행해야 할 미션 목록 (코스가 끝났거나 아직 시작 전이면 제외) */
export function getMissionsDueOn(
  courses: RecommendedCourse[],
  activations: CourseActivation[],
  dateStr: string
): { course: RecommendedCourse; mission: Mission }[] {
  const entries: { course: RecommendedCourse; mission: Mission }[] = [];
  for (const activation of activations) {
    const course = courses.find((c) => c.id === activation.courseId);
    if (!course) continue;
    const dueDay = courseDueDay(activation, dateStr);
    if (dueDay < 1 || dueDay > course.missions.length) continue;
    const mission = course.missions.find((m) => m.day === dueDay);
    if (mission) entries.push({ course, mission });
  }
  return entries;
}

export function getTodayMissions(
  courses: RecommendedCourse[],
  activations: CourseActivation[],
  records: MissionRecord[],
  today: string = getLocalDateString()
): TodayMissionEntry[] {
  return getMissionsDueOn(courses, activations, today).map(({ course, mission }) => ({
    course,
    mission,
    record: findMissionRecord(records, mission.id, today),
  }));
}

export function isCourseFinished(
  course: RecommendedCourse,
  activation: CourseActivation,
  today: string = getLocalDateString()
): boolean {
  return courseDueDay(activation, today) > course.missions.length;
}

/** 오늘을 포함해 며칠 연속으로 "그날 예정된 미션을 모두" 완료했는지 */
export function computeStreak(
  courses: RecommendedCourse[],
  activations: CourseActivation[],
  records: MissionRecord[],
  today: string = getLocalDateString()
): number {
  let streak = 0;
  let cursor = today;

  // 무한 루프 방지용 상한 (1년)
  for (let i = 0; i < 365; i++) {
    const dueToday = getMissionsDueOn(courses, activations, cursor);
    if (dueToday.length === 0) break;
    const allCompleted = dueToday.every(
      ({ mission }) => findMissionRecord(records, mission.id, cursor)?.completed
    );
    if (!allCompleted) break;
    streak++;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export interface WeeklyCompletion {
  completed: number;
  scheduled: number;
  /** 0~100 정수 퍼센트 */
  rate: number;
}

/** 이번 주(월~오늘)에 예정된 미션 대비 완료율 */
export function computeWeeklyCompletion(
  courses: RecommendedCourse[],
  activations: CourseActivation[],
  records: MissionRecord[],
  today: string = getLocalDateString()
): WeeklyCompletion {
  const weekStart = startOfWeek(today);
  let scheduled = 0;
  let completed = 0;

  let cursor = weekStart;
  while (diffDays(cursor, today) >= 0) {
    const due = getMissionsDueOn(courses, activations, cursor);
    scheduled += due.length;
    completed += due.filter(
      ({ mission }) => findMissionRecord(records, mission.id, cursor)?.completed
    ).length;
    cursor = addDays(cursor, 1);
  }

  const rate = scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
  return { completed, scheduled, rate };
}

export type DayStatus = "completed" | "partial" | "missed" | "upcoming" | "none";

export interface WeekDayInfo {
  date: string;
  status: DayStatus;
}

/** 이번 주(월~일) 하루하루의 진행 상태. 그래프/스트릭 시각화에 사용한다 */
export function getWeekDayStatuses(
  courses: RecommendedCourse[],
  activations: CourseActivation[],
  records: MissionRecord[],
  today: string = getLocalDateString()
): WeekDayInfo[] {
  const weekStart = startOfWeek(today);
  const days: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const due = getMissionsDueOn(courses, activations, date);
    const isFuture = diffDays(today, date) > 0;

    let status: DayStatus;
    if (due.length === 0) {
      status = isFuture ? "upcoming" : "none";
    } else {
      const completedCount = due.filter(
        ({ mission }) => findMissionRecord(records, mission.id, date)?.completed
      ).length;
      if (completedCount === due.length) status = "completed";
      else if (completedCount > 0) status = "partial";
      else status = isFuture ? "upcoming" : "missed";
    }

    days.push({ date, status });
  }

  return days;
}
