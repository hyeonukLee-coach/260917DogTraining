import { MissionCategory, PurposeTag } from "@/types/wellness";

/**
 * Firebase(Firestore + Auth)를 이용한 커뮤니티/영상 추천 데이터 모델.
 * 이 앱의 나머지 부분(반려견 프로필·웰니스 플랜)은 여전히 로그인 없이
 * 브라우저 로컬에만 저장되고, 커뮤니티 기능만 Firebase를 사용한다.
 */

/** 게시판 종류: 미션 인증 / 자유 / 질문 / 작은 성과 */
export type PostType = "mission" | "free" | "question" | "achievement";

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  /** 훈련사 인증 배지. 클라이언트에서 스스로 켤 수 없고 Firebase 콘솔에서만 부여한다 */
  isTrainer: boolean;
  createdAt: number;
}

export interface Post {
  id: string;
  type: PostType;
  authorUid: string;
  authorName: string;
  authorPhotoURL?: string;
  /** 작성 시점의 훈련사 배지 스냅샷 */
  authorIsTrainer: boolean;
  title: string;
  content: string;
  /** 미션 인증 게시글만 사용: 본인이 올린 영상(유튜브/드라이브 등) 링크 */
  videoUrl?: string;
  missionCourseTitle?: string;
  missionWeek?: number;
  /** 피드백이 해결되어 작성자가 완료 처리했는지 */
  resolved: boolean;
  createdAt: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorIsTrainer: boolean;
  text: string;
  createdAt: number;
}

/** 교육 영상 카탈로그 (Firebase 콘솔/시드 스크립트로만 관리) */
export interface TrainingVideo {
  id: string;
  title: string;
  url: string;
  category: MissionCategory;
  /** 프로그램 내에서 이 영상이 어울리는 주차 힌트 (1~8) */
  weekNumber: number;
  purposeTags: PurposeTag[];
  description: string;
}

export interface VideoProgramWeek {
  week: number;
  video: TrainingVideo;
}

/** 로컬(localStorage)에 저장되는 반려견별 영상 프로그램 진행 상태 */
export interface VideoProgramState {
  courseId: string;
  weeks: 4 | 8;
  /** 주차별로 배정된 영상 id (매번 다시 매칭하지 않도록 최초 생성 시점에 고정) */
  items: { week: number; videoId: string }[];
  /** 시청 완료로 표시한 주차 번호 목록 */
  completedWeeks: number[];
}
