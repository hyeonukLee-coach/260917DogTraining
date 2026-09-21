/**
 * UNIPAWS AI WELLNESS 데이터 모델.
 * 반려견·커리큘럼·미션 기록은 로그인 계정(Firestore)에 저장되어, 같은 계정으로
 * 다시 로그인하면 이어서 사용할 수 있다. Gemini API 키만 예외적으로 이 브라우저의
 * localStorage에 남는다(서버로 전송되지 않기 위해).
 */

export type Gender = "수컷" | "암컷";
export type ActivityLevel = "낮음" | "보통" | "높음";
export type Difficulty = "초급" | "중급" | "고급";

/** 미션 대분류 */
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

/** 커리큘럼 전체 길이 (주 단위) */
export type ProgramLength = 4 | 8;

/** 로그인 계정 프로필. Firestore users/{uid}와 1:1 대응 */
export interface User {
  id: string;
  createdAt: string;
}

export interface Dog {
  id: string;
  /** 이 강아지를 등록한 사용자의 Firebase uid */
  ownerUid: string;
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
  createdAt: number;
  updatedAt: number;
}

/**
 * 반려견 사진은 Firestore 문서 용량(1MiB) 부담과 Storage 미사용 방침 때문에
 * 계정에 동기화하지 않고, 이 브라우저의 localStorage에 dogId로만 붙여둔다.
 */
export type DogPhotoMap = Record<string, string>;

/** analyzeDog에 넘기는 입력. Dog에서 시각 필드만 뺀 형태 */
export type AssessmentInput = Omit<Dog, "createdAt" | "updatedAt">;

/** 하루치 커리큘럼에 들어가는 실행 항목(미션) */
export interface Mission {
  id: string;
  category: MissionCategory;
  /** 커리큘럼 전체에서 며칠 차 미션인지 (1~totalDays) */
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

export interface CurriculumDay {
  day: number;
  items: Mission[];
}

/**
 * 강아지 한 마리당 하나씩 존재하는 통합 커리큘럼.
 * 교육/운동/생활관리를 사용자가 따로 고르지 않고, 이슈·목표를 반영해
 * 하루하루 적절히 배합해 만든다. 주차(1주차, 2주차...) 단위로 묶어서 보여주고,
 * 펼치면 그 주의 일차별 미션이 나온다.
 */
export interface Curriculum {
  id: string;
  dogId: string;
  weeks: ProgramLength;
  totalDays: number;
  /** YYYY-MM-DD. 커리큘럼이 만들어진 날짜 = 1일차에 대응하는 날짜 */
  startDate: string;
  currentStateSummary: string;
  goals: WellnessGoal[];
  priorityAreas: WellnessGoal[];
  /** 목표·이슈를 반영해 왜 이렇게 구성했는지 설명하는 통합 요약 */
  summary: string;
  needsVetNotice: boolean;
  source: GenerationMode;
  days: CurriculumDay[];
  createdAt: number;
}

/** analyzeDog의 반환 타입. 이 계약만 유지하면 규칙 기반 로직을 실제 AI로 교체할 수 있다 */
export type WellnessPlan = Omit<Curriculum, "id" | "dogId" | "startDate" | "createdAt">;

/** 특정 날짜에 특정 미션을 완료했는지 기록 */
export interface MissionRecord {
  id: string;
  dogId: string;
  missionId: string;
  /** YYYY-MM-DD, 완료(또는 완료 취소)한 날짜 */
  date: string;
  completed: boolean;
  completedAt?: number;
}
