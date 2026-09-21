import { PostType } from "@/types/community";

export const POST_TYPE_LABELS: Record<PostType, string> = {
  mission: "미션 인증",
  free: "자유게시판",
  question: "질문 게시판",
  achievement: "작은 성과",
};

export const POST_TYPE_ORDER: PostType[] = ["mission", "free", "question", "achievement"];

export function formatRelativeTime(millis: number): string {
  const diffMs = Date.now() - millis;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "방금 전";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}일 전`;

  const date = new Date(millis);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

/** 유튜브/드라이브 등 외부 영상 링크의 최소한의 형태 검증 (http/https URL인지만 확인) */
export function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
