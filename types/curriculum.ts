export type CurriculumType = "운동" | "교육" | "둘다";

export type Gender = "수컷" | "암컷";

export type ActivityLevel = "낮음" | "보통" | "높음";

export type Difficulty = "초급" | "중급" | "고급";

export type PurposeTag =
  | "관절관리"
  | "체중관리"
  | "근력강화"
  | "행동교육"
  | "정서안정"
  | "활동량증가"
  | "사회화"
  | "집중력향상";

export interface DogProfile {
  id: string;
  name: string;
  /** ISO 날짜 문자열(YYYY-MM-DD). birthDate, ageYears 중 최소 하나는 존재해야 함 */
  birthDate?: string;
  ageYears?: number;
  breed: string;
  gender?: Gender;
  weightKg?: number;
  neutered?: boolean;
  activityLevel?: ActivityLevel;
  dailyWalkMinutes?: number;
  behaviorConcerns?: string;
  physicalConcerns?: string;
  curriculumType: CurriculumType;
  createdAt: string;
}

export interface CurriculumItem {
  id: string;
  type: "운동" | "교육";
  name: string;
  difficulty: Difficulty;
  purposeTags: PurposeTag[];
  /** 왜 필요한가요? */
  description: string;
  /** 어떻게 하나요? */
  method: string;
  /** 주의할 점 */
  caution: string;
}

export interface CurriculumDay {
  day: number;
  items: CurriculumItem[];
}

export interface GeneratedCurriculum {
  id: string;
  profileId: string;
  days: CurriculumDay[];
  needsVetNotice: boolean;
  createdAt: string;
}
