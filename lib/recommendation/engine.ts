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
  Difficulty,
  Mission,
  MissionCategory,
  PurposeTag,
  RecommendedCourse,
  WellnessAssessment,
  WellnessGoal,
  WellnessPlan,
} from "@/types/wellness";

const COURSE_LENGTH_DAYS = 7;

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  초급: 0,
  중급: 1,
  고급: 2,
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

interface CourseCopy {
  title: string;
  description: string;
}

const COURSE_COPY: Record<MissionCategory, Partial<Record<WellnessGoal, CourseCopy>>> = {
  교육: {
    관계형성: {
      title: "보호자 집중 관계형성 7일 코스",
      description: "교감을 쌓아가는 7일 훈련으로 보호자와의 신뢰를 단단히 다져요.",
    },
    행동교육: {
      title: "차분한 행동 교정 7일 코스",
      description: "일상 속 행동 고민을 하나씩 풀어가는 7일 교육 코스예요.",
    },
    정서적안정: {
      title: "마음이 편안해지는 7일 코스",
      description: "불안을 줄이고 안정감을 키우는 7일 교육 루틴이에요.",
    },
    시니어관리: {
      title: "시니어犬 맞춤 교감 7일 코스",
      description: "나이에 맞춘 부드러운 자극으로 인지 활력을 지켜줘요.",
    },
  },
  운동: {
    근력강화: {
      title: "기초 코어 밸런스 7일 코스",
      description: "코어와 관절을 지지하는 근력을 키우는 7일 운동 코스예요.",
    },
    활동량증가: {
      title: "하루 활동량 개선 챌린지",
      description: "에너지를 건강하게 발산하는 7일 활동 챌린지예요.",
    },
    체중관리: {
      title: "건강 체중 관리 7일 코스",
      description: "무리 없이 체중을 관리하는 7일 운동 루틴이에요.",
    },
    관절관리: {
      title: "관절이 편안해지는 7일 코스",
      description: "관절에 가는 부담을 줄이면서 몸을 움직이는 7일 코스예요.",
    },
  },
  생활관리: {
    생활습관개선: {
      title: "건강한 하루 루틴 7일 코스",
      description: "작은 습관부터 차근차근 바꿔가는 7일 생활관리 코스예요.",
    },
    정서적안정: {
      title: "편안한 일상 만들기 7일 코스",
      description: "일상 환경을 정돈해 정서적 안정을 돕는 7일 코스예요.",
    },
    체중관리: {
      title: "체중 관리 생활습관 7일 코스",
      description: "급여와 활동 습관을 함께 관리하는 7일 코스예요.",
    },
    시니어관리: {
      title: "시니어犬 생활 케어 7일 코스",
      description: "나이 든 반려견의 몸에 맞춘 생활 관리 7일 코스예요.",
    },
  },
};

function buildCourseCopy(category: MissionCategory, topGoal: WellnessGoal): CourseCopy {
  const preset = COURSE_COPY[category][topGoal];
  if (preset) return preset;
  return {
    title: `${topGoal} 집중 ${category} 7일 코스`,
    description: `${withEulReul(topGoal)} 목표로 짜인 7일 맞춤 ${category} 코스예요.`,
  };
}

function pickTopGoal(templates: MissionTemplate[], rankedGoals: WellnessGoal[]): WellnessGoal {
  const tagsInCategory = new Set<PurposeTag>();
  for (const t of templates) {
    for (const tag of t.purposeTags) tagsInCategory.add(tag);
  }
  for (const goal of rankedGoals) {
    if (tagsInCategory.has(goal)) return goal;
  }
  return rankedGoals[0];
}

function buildCourse(
  category: MissionCategory,
  templates: MissionTemplate[],
  targetTags: Set<PurposeTag>,
  maxDifficulty: Difficulty,
  rankedGoals: WellnessGoal[]
): RecommendedCourse {
  const pool = buildSortedPool(templates, targetTags, maxDifficulty);
  const sequence = buildCyclicSequence(pool, COURSE_LENGTH_DAYS);

  const missions: Mission[] = sequence.map((template, index) => ({
    ...template,
    day: index + 1,
    id: `${template.id}-${generateId()}`,
  }));

  const topGoal = pickTopGoal(templates, rankedGoals);
  const { title, description } = buildCourseCopy(category, topGoal);

  const matchedGoals = rankedGoals
    .filter((goal) => templates.some((t) => t.purposeTags.includes(goal)))
    .slice(0, 3);

  return {
    id: generateId(),
    category,
    title,
    description,
    matchedGoals: matchedGoals.length > 0 ? matchedGoals : [topGoal],
    missions,
  };
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

function buildCategorySummary(
  category: MissionCategory,
  topGoal: WellnessGoal,
  dogName: string
): string {
  return `${dogName}에게는 ${withEulReul(topGoal)} 위한 ${category} 코스가 특히 도움이 될 거예요.`;
}

/**
 * 반려견 프로필을 입력받아 웰니스 분석 결과와 3개(교육/운동/생활관리) 추천 코스를 만든다.
 * 이 함수의 입력/출력 타입은 고정되어 있으며, 추후 규칙 기반 로직 대신
 * 실제 AI API 호출(lib/recommendation/aiEngine.ts)로 손쉽게 교체할 수 있다.
 */
export function analyzeDog(input: AssessmentInput): WellnessPlan {
  const ageYears = resolveAgeYears(input);
  const goalScores = scoreGoals(input, ageYears);
  const rankedGoals = [...input.goals].sort(
    (a, b) => (goalScores.get(b) ?? 0) - (goalScores.get(a) ?? 0)
  );

  const targetTags = resolveTargetTags(input, ageYears);
  const maxDifficulty = resolveMaxDifficulty(input, ageYears);

  const educationCourse = buildCourse("교육", educationTemplates, targetTags, maxDifficulty, rankedGoals);
  const exerciseCourse = buildCourse("운동", exerciseTemplates, targetTags, maxDifficulty, rankedGoals);
  const lifestyleCourse = buildCourse("생활관리", lifestyleTemplates, targetTags, maxDifficulty, rankedGoals);

  const needsVetNotice =
    (input.physicalConcerns?.trim().length ?? 0) > 0 || (input.healthConditions?.trim().length ?? 0) > 0;

  const assessment: WellnessAssessment = {
    id: generateId(),
    dogId: input.id,
    currentStateSummary: buildCurrentStateSummary(input, ageYears),
    goals: input.goals,
    priorityAreas: rankedGoals,
    recommendedEducationSummary: buildCategorySummary(
      "교육",
      pickTopGoal(educationTemplates, rankedGoals),
      input.name
    ),
    recommendedExerciseSummary: buildCategorySummary(
      "운동",
      pickTopGoal(exerciseTemplates, rankedGoals),
      input.name
    ),
    recommendedLifestyleSummary: buildCategorySummary(
      "생활관리",
      pickTopGoal(lifestyleTemplates, rankedGoals),
      input.name
    ),
    needsVetNotice,
    source: "rule",
    createdAt: new Date().toISOString(),
  };

  return {
    assessment,
    courses: [educationCourse, exerciseCourse, lifestyleCourse],
  };
}
