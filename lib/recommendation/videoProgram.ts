import { trainingVideosSeed } from "@/data/trainingVideos.seed";
import { listTrainingVideos } from "@/lib/firebase/posts";
import { buildCyclicSequence } from "@/lib/recommendation/sequence";
import { TrainingVideo, VideoProgramWeek } from "@/types/community";
import { RecommendedCourse, WellnessAssessment } from "@/types/wellness";

export type ProgramLength = 4 | 8;

/**
 * 우선 관리 영역이 많거나(다뤄야 할 목표가 넓음) 건강 특이사항이 있으면
 * 더 촘촘한 8주 프로그램을, 그렇지 않으면 4주 프로그램을 기본값으로 추천한다.
 * 최종 선택은 항상 보호자가 직접 한다(이건 어디까지나 "추천"일 뿐).
 */
export function recommendProgramWeeks(assessment: WellnessAssessment): ProgramLength {
  if (assessment.needsVetNotice) return 8;
  if (assessment.priorityAreas.length >= 3) return 8;
  return 4;
}

function scoreVideo(video: TrainingVideo, course: RecommendedCourse): number {
  let score = 0;
  const matchedGoals: readonly string[] = course.matchedGoals;
  for (const tag of video.purposeTags) {
    if (matchedGoals.includes(tag)) score += 2;
  }
  if (video.category === course.category) score += 1;
  return score;
}

/**
 * Firestore trainingVideos 컬렉션에서 카탈로그를 가져오고, 비어있으면
 * (아직 scripts/seedTrainingVideos.mjs를 실행하지 않은 경우) 로컬 시드로
 * 대체해 기능이 항상 동작하게 한다.
 */
export async function fetchTrainingVideoCatalog(): Promise<TrainingVideo[]> {
  try {
    const videos = await listTrainingVideos("교육");
    if (videos.length > 0) return videos;
  } catch {
    // Firestore 조회 실패 시에도 로컬 시드로 대체한다.
  }
  return trainingVideosSeed;
}

export function buildVideoProgram(
  course: RecommendedCourse,
  catalog: TrainingVideo[],
  weeks: ProgramLength
): VideoProgramWeek[] {
  const pool = [...catalog].sort((a, b) => scoreVideo(b, course) - scoreVideo(a, course));
  const sequence = buildCyclicSequence(pool, weeks);
  return sequence.map((video, index) => ({ week: index + 1, video }));
}
