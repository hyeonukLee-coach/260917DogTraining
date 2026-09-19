/**
 * UNIPAWS AI WELLNESS 데이터 모델.
 * 서버/DB 없이 브라우저 localStorage에만 저장되며,
 * 추후 실제 API로 교체하기 쉽도록 타입과 로직을 분리해 둔다.
 */

export type Gender = "수컷" | "암컷";
export type ActivityLevel = "낮음" | "보통" | "높음";
export type Difficulty = "초급" | "중급" | "고급";

/** 미션/코스 대분류 */
export type MissionCategory = "교육" | "운동" | "생활관리";

/** 보호자가 고를 수 있는 웰니스 목표 (최소 1개 필수) */
export const WELLNESS_GOALS = [
  "관계형성",
  "행동교육",
  "체중관리",
  "근력강화",
  "관절관리",
  "시니어관리",
  "활동량증가",
  "정서적안정",
  "생활습관개선",
] as const;

export type WellnessGoal = (typeof WELLNESS_GOALS)[number];

/** 미션에 붙는 세부 태그. 목표(WellnessGoal)보다 조금 더 촘촘하다 */
export type PurposeTag = WellnessGoal | "사회화" | "집중력향상";

/** AI 분석을 규칙 기반 엔진과 Gemini 중 무엇으로 만들었는지 */
export type GenerationMode = "rule" | "ai";

/** 로그인 없는 MVP의 로컬 사용자(보호자) 식별자. 서버로 전송되지 않는다 */
export interface User {
  id: string;
  createdAt: string;
}

export interface Dog {
  id: string;
  name: string;
  /** ISO 날짜 문자열(YYYY-MM-DD). birthDate, ageYears 중 최소 하나는 존재해야 함 */
  birthDate?: string;
  ageYears?: number;
  breed: string;
  gender?: Gender;
  weightKg?: number;
  neutered?: boolean;
  /** 현재 질환/건강 특이사항 */
  healthConditions?: string;
  activityLevel?: ActivityLevel;
  dailyWalkMinutes?: number;
  /** 보호자가 느끼는 행동 고민 */
  behaviorConcerns?: string;
  /** 신체적으로 걱정되는 부분 */
  physicalConcerns?: string;
  /** 보호자가 원하는 목표 (최소 1개) */
  goals: WellnessGoal[];
  /** 로컬 미리보기용 base64 이미지 (선택) */
  photoDataUrl?: string;
  createdAt: string;
}

/** analyzeDog에 넘기는 입력. Dog에서 생성 시각만 뺀 형태 */
export type AssessmentInput = Omit<Dog, "createdAt">;

/** 하나의 실행 항목(미션) */
export interface Mission {
  id: string;
  category: MissionCategory;
  /** 코스 내 며칠 차 미션인지 (1~7) */
  day: number;
  name: string;
  difficulty: Difficulty;
  purposeTags: PurposeTag[];
  /** 왜 필요한가요? */
  why: string;
  /** 어떻게 하나요? */
  how: string;
  /** 주의할 점 */
  caution: string;
  /** 짧고 따뜻한 톤을 위한 이모지 1개 (선택) */
  emoji?: string;
}

/** 카테고리별 7일 추천 코스 */
export interface RecommendedCourse {
  id: string;
  category: MissionCategory;
  title: string;
  description: string;
  matchedGoals: WellnessGoal[];
  missions: Mission[];
}

/** AI(규칙 기반) 웰니스 분석 결과 */
export interface WellnessAssessment {
  id: string;
  dogId: string;
  currentStateSummary: string;
  goals: WellnessGoal[];
  priorityAreas: WellnessGoal[];
  recommendedEducationSummary: string;
  recommendedExerciseSummary: string;
  recommendedLifestyleSummary: string;
  needsVetNotice: boolean;
  source: GenerationMode;
  createdAt: string;
}

/** analyzeDog의 반환 타입. 이 계약만 유지하면 규칙 기반 로직을 실제 AI로 교체할 수 있다 */
export interface WellnessPlan {
  assessment: WellnessAssessment;
  courses: RecommendedCourse[];
}

/** 특정 날짜에 특정 미션을 완료했는지 기록 */
export interface MissionRecord {
  id: string;
  missionId: string;
  dogId: string;
  /** YYYY-MM-DD, 완료(또는 완료 취소)한 날짜 */
  date: string;
  completed: boolean;
  completedAt?: string;
}

/** 사용자가 시작하기로 선택한 코스와 시작일 */
export interface CourseActivation {
  courseId: string;
  /** YYYY-MM-DD, 코스 1일차에 대응하는 날짜 */
  startDate: string;
}
