import { generateId } from "@/lib/dataStore";
import { buildCyclicSequence } from "@/lib/recommendation/sequence";
import {
  educationTemplates,
  exerciseTemplates,
  lifestyleTemplates,
  MissionTemplate,
} from "@/data/missionLibrary";
import {
  AssessmentInput,
  CurriculumDay,
  Difficulty,
  Mission,
  MissionCategory,
  ProgramLength,
  PurposeTag,
  WellnessGoal,
  WellnessPlan,
} from "@/types/wellness";

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  초급: 0,
  중급: 1,
  고급: 2,
};

const CATEGORY_ORDER: MissionCategory[] = ["교육", "운동", "생활관리"];

const TEMPLATES_BY_CATEGORY: Record<MissionCategory, MissionTemplate[]> = {
  교육: educationTemplates,
  운동: exerciseTemplates,
  생활관리: lifestyleTemplates,
};

function resolveAgeYears(input: AssessmentInput): number | undefined {
  if (input.birthDate) {
    const birth = new Date(input.birthDate);
    if (!Number.isNaN(birth.getTime())) {
      const years = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return Math.max(0, years);
    }
  }
  if (typeof input.ageYears === "number" && !Number.isNaN(input.ageYears)) {
    return input.ageYears;
  }
  return undefined;
}

/** 목표(WellnessGoal)별 가중치 점수. 값이 클수록 우선순위가 높다 */
function scoreGoals(input: AssessmentInput, ageYears: number | undefined): Map<WellnessGoal, number> {
  const scores = new Map<WellnessGoal, number>();
  const bump = (goal: WellnessGoal, amount: number) => {
    scores.set(goal, (scores.get(goal) ?? 0) + amount);
  };

  // 보호자가 직접 고른 목표는 기본적으로 가장 높은 가중치를 가진다
  for (const goal of input.goals) {
    bump(goal, 5);
  }

  if (input.activityLevel === "낮음") bump("활동량증가", 2);
  if (input.activityLevel === "높음") bump("근력강화", 2);

  if (ageYears !== undefined) {
    if (ageYears < 1) {
      bump("관계형성", 2);
      bump("행동교육", 1);
    } else if (ageYears >= 7) {
      bump("시니어관리", 3);
      bump("관절관리", 2);
      bump("정서적안정", 1);
    }
  }

  const physicalConcerns = input.physicalConcerns?.trim() ?? "";
  if (physicalConcerns.length > 0) {
    bump("관절관리", 2);
    if (/체중|비만|살/.test(physicalConcerns)) bump("체중관리", 2);
    if (/관절|고관절|허리|디스크|무릎/.test(physicalConcerns)) bump("관절관리", 2);
  }

  const healthConditions = input.healthConditions?.trim() ?? "";
  if (healthConditions.length > 0) {
    bump("관절관리", 1);
    bump("시니어관리", 1);
  }

  const behaviorConcerns = input.behaviorConcerns?.trim() ?? "";
  if (behaviorConcerns.length > 0) {
    bump("행동교육", 2);
    if (/분리|혼자/.test(behaviorConcerns)) bump("정서적안정", 2);
    if (/사회|낯가림|낯설|무서|공격|경계/.test(behaviorConcerns)) bump("관계형성", 1);
  }

  return scores;
}

/** 우선 관리 영역용 목표 태그와, 미션 선택에 쓰는 더 촘촘한 세부 태그를 함께 만든다 */
function resolveTargetTags(input: AssessmentInput, ageYears: number | undefined): Set<PurposeTag> {
  const tags = new Set<PurposeTag>(input.goals);

  if (input.activityLevel === "낮음") tags.add("활동량증가");
  if (input.activityLevel === "높음") tags.add("근력강화");

  if (ageYears !== undefined) {
    if (ageYears < 1) {
      tags.add("사회화");
      tags.add("집중력향상");
      tags.add("관계형성");
    } else if (ageYears >= 7) {
      tags.add("관절관리");
      tags.add("정서적안정");
      tags.add("시니어관리");
    }
  }

  const physicalConcerns = input.physicalConcerns?.trim() ?? "";
  if (physicalConcerns.length > 0) {
    tags.add("관절관리");
    if (/체중|비만|살/.test(physicalConcerns)) tags.add("체중관리");
  }

  const behaviorConcerns = input.behaviorConcerns?.trim() ?? "";
  if (behaviorConcerns.length > 0) {
    tags.add("행동교육");
    if (/분리|혼자/.test(behaviorConcerns)) tags.add("정서적안정");
    if (/사회|낯가림|낯설|무서|공격|경계/.test(behaviorConcerns)) tags.add("사회화");
  }

  return tags;
}

function resolveMaxDifficulty(input: AssessmentInput, ageYears: number | undefined): Difficulty {
  const hasConcerns =
    (input.physicalConcerns?.trim().length ?? 0) > 0 || (input.healthConditions?.trim().length ?? 0) > 0;
  const isPuppy = ageYears !== undefined && ageYears < 1;
  const isSenior = ageYears !== undefined && ageYears >= 7;

  if (hasConcerns || isSenior || isPuppy || input.activityLevel === "낮음") {
    return "중급";
  }
  return "고급";
}

function scoreTemplate(template: MissionTemplate, targetTags: Set<PurposeTag>): number {
  let score = 0;
  for (const tag of template.purposeTags) {
    if (targetTags.has(tag)) score += 2;
  }
  score += (2 - DIFFICULTY_RANK[template.difficulty]) * 0.1;
  return score;
}

function buildSortedPool(
  templates: MissionTemplate[],
  targetTags: Set<PurposeTag>,
  maxDifficulty: Difficulty
): MissionTemplate[] {
  const allowedRank = DIFFICULTY_RANK[maxDifficulty];
  const filtered = templates.filter((t) => DIFFICULTY_RANK[t.difficulty] <= allowedRank);
  const pool = filtered.length > 0 ? filtered : templates;
  return [...pool].sort((a, b) => scoreTemplate(b, targetTags) - scoreTemplate(a, targetTags));
}

/**
 * 건강 특이사항이 있거나(더 꼼꼼히 다뤄야 함) 챙길 목표가 많으면(3개 이상)
 * 더 촘촘한 8주 과정을, 그렇지 않으면 4주 과정을 기본으로 한다.
 */
export function decideProgramWeeks(needsVetNotice: boolean, priorityGoalCount: number): ProgramLength {
  if (needsVetNotice || priorityGoalCount >= 3) return 8;
  return 4;
}

function buildCurrentStateSummary(input: AssessmentInput, ageYears: number | undefined): string {
  const parts: string[] = [];
  const ageText = ageYears !== undefined ? `약 ${Math.round(ageYears * 10) / 10}세` : "나이 정보 미입력";
  parts.push(`${input.name}(${input.breed}, ${ageText})는`);

  if (input.activityLevel) {
    parts.push(`평소 활동량이 ${input.activityLevel}이고,`);
  }
  if (input.dailyWalkMinutes !== undefined) {
    parts.push(`하루 약 ${input.dailyWalkMinutes}분 산책해요.`);
  }
  if (input.behaviorConcerns?.trim()) {
    parts.push(`보호자는 "${input.behaviorConcerns.trim()}"을(를) 고민하고 있어요.`);
  }
  if (input.physicalConcerns?.trim()) {
    parts.push(`신체적으로는 "${input.physicalConcerns.trim()}" 부분이 걱정된다고 했어요.`);
  }

  return parts.join(" ");
}

/** 한글 단어 끝 글자의 받침 유무에 따라 "을"/"를" 조사를 붙인다 */
function withEulReul(word: string): string {
  const lastChar = word.charCodeAt(word.length - 1);
  const isHangulSyllable = lastChar >= 0xac00 && lastChar <= 0xd7a3;
  if (!isHangulSyllable) return `${word}을(를)`;
  const hasBatchim = (lastChar - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? "을" : "를"}`;
}

function buildUnifiedSummary(
  dogName: string,
  rankedGoals: WellnessGoal[],
  weeks: ProgramLength
): string {
  const [topGoal, secondGoal] = rankedGoals;
  const goalPhrase = secondGoal
    ? `${withEulReul(topGoal)} 가장 먼저 챙기고 ${secondGoal}도 함께`
    : `${withEulReul(topGoal)} 중심으로`;
  return `${dogName}는 ${goalPhrase} 관리할 수 있도록, 교육·운동·생활관리를 하루하루 적절히 배합해 ${weeks}주 커리큘럼으로 짰어요. 매일 한 가지씩 꾸준히 실천해보세요.`;
}

/**
 * 반려견 프로필을 입력받아, 이슈와 목표를 반영해 교육·운동·생활관리를 하루하루
 * 배합한 하나의 통합 커리큘럼(WellnessPlan)을 만든다. 이 함수의 입력/출력 타입은
 * 고정되어 있으며, 추후 규칙 기반 로직 대신 실제 AI API 호출
 * (lib/recommendation/aiEngine.ts)로 손쉽게 교체할 수 있다.
 */
export function analyzeDog(input: AssessmentInput): WellnessPlan {
  const ageYears = resolveAgeYears(input);
  const goalScores = scoreGoals(input, ageYears);
  const rankedGoals = [...input.goals].sort(
    (a, b) => (goalScores.get(b) ?? 0) - (goalScores.get(a) ?? 0)
  );

  const targetTags = resolveTargetTags(input, ageYears);
  const maxDifficulty = resolveMaxDifficulty(input, ageYears);

  const needsVetNotice =
    (input.physicalConcerns?.trim().length ?? 0) > 0 || (input.healthConditions?.trim().length ?? 0) > 0;
  const weeks = decideProgramWeeks(needsVetNotice, rankedGoals.length);
  const totalDays = weeks * 7;

  const perCategoryLength = Math.ceil(totalDays / CATEGORY_ORDER.length);
  const sequences = Object.fromEntries(
    CATEGORY_ORDER.map((category) => {
      const pool = buildSortedPool(TEMPLATES_BY_CATEGORY[category], targetTags, maxDifficulty);
      return [category, buildCyclicSequence(pool, perCategoryLength)];
    })
  ) as Record<MissionCategory, MissionTemplate[]>;

  const categoryCursor: Record<MissionCategory, number> = { 교육: 0, 운동: 0, 생활관리: 0 };

  const days: CurriculumDay[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const category = CATEGORY_ORDER[(day - 1) % CATEGORY_ORDER.length];
    const template = sequences[category][categoryCursor[category]++];
    const item: Mission = {
      ...template,
      day,
      id: `${template.id}-${generateId()}`,
    };
    days.push({ day, items: [item] });
  }

  return {
    weeks,
    totalDays,
    currentStateSummary: buildCurrentStateSummary(input, ageYears),
    goals: input.goals,
    priorityAreas: rankedGoals,
    summary: buildUnifiedSummary(input.name, rankedGoals, weeks),
    needsVetNotice,
    source: "rule",
    days,
  };
}
