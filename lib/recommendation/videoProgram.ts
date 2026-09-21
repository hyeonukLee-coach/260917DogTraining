import { trainingVideosSeed } from "@/data/trainingVideos.seed";
import { listTrainingVideos } from "@/lib/firebase/posts";
import { buildCyclicSequence } from "@/lib/recommendation/sequence";
import { TrainingVideo, VideoProgramWeek } from "@/types/community";
import { Curriculum, PurposeTag } from "@/types/wellness";

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

function scoreVideo(video: TrainingVideo, priorityAreas: PurposeTag[]): number {
  let score = 0;
  for (const tag of video.purposeTags) {
    if (priorityAreas.includes(tag)) score += 2;
  }
  if (video.category === "교육") score += 1;
  return score;
}

/** 커리큘럼의 우선 관리 영역에 맞는 영상을, 커리큘럼과 같은 주차 수만큼 배정한다 */
export function buildVideoProgram(curriculum: Curriculum, catalog: TrainingVideo[]): VideoProgramWeek[] {
  const pool = [...catalog].sort(
    (a, b) => scoreVideo(b, curriculum.priorityAreas) - scoreVideo(a, curriculum.priorityAreas)
  );
  const sequence = buildCyclicSequence(pool, curriculum.weeks);
  return sequence.map((video, index) => ({ week: index + 1, video }));
}
