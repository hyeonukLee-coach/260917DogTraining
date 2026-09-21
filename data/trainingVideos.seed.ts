import seedJson from "./trainingVideos.seed.json";
import { TrainingVideo } from "@/types/community";

/**
 * Firestore trainingVideos 컬렉션이 아직 비어있을 때 쓰는 로컬 폴백 카탈로그.
 * scripts/seedTrainingVideos.mjs로 Firestore에 같은 내용을 올리면 그 이후로는
 * Firestore 데이터가 우선 사용된다. 링크는 특정 영상 하나를 단정하지 않고
 * 검증 가능한 유튜브 검색 결과로 연결해, 존재하지 않는 영상 ID를 지어내지 않았다.
 */
export const trainingVideosSeed: TrainingVideo[] = seedJson as TrainingVideo[];
