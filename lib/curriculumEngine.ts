import { allSampleItems, exerciseItems, trainingItems } from "@/data/sampleItems";
import {
  CurriculumDay,
  CurriculumItem,
  DogProfile,
  Difficulty,
  PurposeTag,
} from "@/types/curriculum";

const TOTAL_DAYS = 7;

/**
 * 생년월일 또는 입력된 나이를 이용해 대략적인 나이(년)를 계산합니다.
 */
function resolveAgeYears(profile: DogProfile): number | undefined {
  if (profile.birthDate) {
    const birth = new Date(profile.birthDate);
    if (!Number.isNaN(birth.getTime())) {
      const diffMs = Date.now() - birth.getTime();
      const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
      return Math.max(0, years);
    }
  }
  if (typeof profile.ageYears === "number" && !Number.isNaN(profile.ageYears)) {
    return profile.ageYears;
  }
  return undefined;
}

function resolveTargetTags(profile: DogProfile, ageYears: number | undefined): Set<PurposeTag> {
  const tags = new Set<PurposeTag>();

  if (profile.activityLevel === "낮음") {
    tags.add("활동량증가");
  } else if (profile.activityLevel === "높음") {
    tags.add("근력강화");
  }

  if (ageYears !== undefined) {
    if (ageYears < 1) {
      tags.add("사회화");
      tags.add("집중력향상");
    } else if (ageYears >= 7) {
      tags.add("관절관리");
      tags.add("정서안정");
    }
  }

  const physicalConcerns = profile.physicalConcerns?.trim() ?? "";
  if (physicalConcerns.length > 0) {
    tags.add("관절관리");
    if (/체중|비만|살/.test(physicalConcerns)) {
      tags.add("체중관리");
    }
    if (/관절|고관절|허리|디스크|무릎/.test(physicalConcerns)) {
      tags.add("관절관리");
    }
  }

  const behaviorConcerns = profile.behaviorConcerns?.trim() ?? "";
  if (behaviorConcerns.length > 0) {
    tags.add("행동교육");
    if (/짖/.test(behaviorConcerns)) {
      tags.add("행동교육");
    }
    if (/분리|혼자/.test(behaviorConcerns)) {
      tags.add("정서안정");
    }
    if (/사회|낯가림|낯설|무서|공격|경계/.test(behaviorConcerns)) {
      tags.add("사회화");
    }
  }

  return tags;
}

function resolveMaxDifficulty(profile: DogProfile, ageYears: number | undefined): Difficulty {
  const hasPhysicalConcerns = (profile.physicalConcerns?.trim().length ?? 0) > 0;
  const isPuppy = ageYears !== undefined && ageYears < 1;
  const isSenior = ageYears !== undefined && ageYears >= 7;

  if (hasPhysicalConcerns || isSenior || isPuppy || profile.activityLevel === "낮음") {
    return "중급";
  }
  return "고급";
}

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  초급: 0,
  중급: 1,
  고급: 2,
};

function scoreItem(item: CurriculumItem, targetTags: Set<PurposeTag>): number {
  let score = 0;
  for (const tag of item.purposeTags) {
    if (targetTags.has(tag)) score += 2;
  }
  // 기본 난이도가 낮을수록 아주 약한 가산점을 주어 초반 진입 장벽을 낮춘다
  score += (2 - DIFFICULTY_RANK[item.difficulty]) * 0.1;
  return score;
}

function buildSortedPool(
  items: CurriculumItem[],
  targetTags: Set<PurposeTag>,
  maxDifficulty: Difficulty
): CurriculumItem[] {
  const allowedRank = DIFFICULTY_RANK[maxDifficulty];
  const filtered = items.filter((item) => DIFFICULTY_RANK[item.difficulty] <= allowedRank);
  const pool = filtered.length > 0 ? filtered : items;

  return [...pool].sort((a, b) => scoreItem(b, targetTags) - scoreItem(a, targetTags));
}

/**
 * 정렬된 아이템 풀을 이용해 필요한 길이만큼의 시퀀스를 생성한다.
 * 점수가 높은 항목이 더 자주 등장하되, 매 바퀴(lap)마다 시작 위치를 옮겨
 * 같은 항목이 연속으로 몰리지 않도록 한다.
 */
function buildSequence(pool: CurriculumItem[], length: number): CurriculumItem[] {
  if (pool.length === 0) return [];
  const sequence: CurriculumItem[] = [];
  let lap = 0;
  while (sequence.length < length) {
    const offset = lap % pool.length;
    for (let i = 0; i < pool.length && sequence.length < length; i++) {
      sequence.push(pool[(i + offset) % pool.length]);
    }
    lap++;
  }
  return sequence;
}

function withFreshIds(item: CurriculumItem, day: number, index: number): CurriculumItem {
  return { ...item, id: `${item.id}-d${day}-${index}` };
}

/**
 * 반려견 프로필을 입력받아 7일치 커리큘럼을 생성한다.
 * 이 함수의 입력/출력 타입은 고정되어 있으며, 추후 규칙 기반 로직 대신
 * 실제 AI API 호출로 손쉽게 교체할 수 있다.
 */
export function generateCurriculum(profile: DogProfile): CurriculumDay[] {
  const ageYears = resolveAgeYears(profile);
  const targetTags = resolveTargetTags(profile, ageYears);
  const maxDifficulty = resolveMaxDifficulty(profile, ageYears);

  const days: CurriculumDay[] = [];

  if (profile.curriculumType === "둘다") {
    const exercisePool = buildSortedPool(exerciseItems, targetTags, maxDifficulty);
    const trainingPool = buildSortedPool(trainingItems, targetTags, maxDifficulty);
    const exerciseSeq = buildSequence(exercisePool, TOTAL_DAYS);
    const trainingSeq = buildSequence(trainingPool, TOTAL_DAYS);

    for (let day = 1; day <= TOTAL_DAYS; day++) {
      const dayItems = [
        withFreshIds(exerciseSeq[day - 1], day, 0),
        withFreshIds(trainingSeq[day - 1], day, 1),
      ];
      days.push({ day, items: dayItems });
    }
  } else {
    const sourceItems = profile.curriculumType === "운동" ? exerciseItems : trainingItems;
    const pool = buildSortedPool(sourceItems, targetTags, maxDifficulty);
    const sequence = buildSequence(pool, TOTAL_DAYS * 2);

    for (let day = 1; day <= TOTAL_DAYS; day++) {
      const first = sequence[(day - 1) * 2];
      const second = sequence[(day - 1) * 2 + 1];
      const dayItems = [first, second]
        .filter((item, idx, arr) => item && arr.findIndex((x) => x?.id === item.id) === idx)
        .map((item, idx) => withFreshIds(item, day, idx));
      days.push({ day, items: dayItems });
    }
  }

  return days;
}

/** 참고용: 사용 가능한 전체 샘플 항목 수 (테스트/디버깅 용도) */
export const SAMPLE_ITEM_COUNT = allSampleItems.length;
