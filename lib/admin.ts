/**
 * 관리자 판별 로직. 이 목록에 있는 이메일로 Google 로그인한 사용자만 관리자다.
 * firestore.rules의 isAdmin() 함수와 반드시 같은 이메일 목록을 유지해야 한다
 * (여기는 UI 표시/라우트 가드용, 실제 데이터 접근 통제는 Firestore 규칙이 담당).
 */
export const ADMIN_EMAILS = ["wlwhso1227@gmail.com"];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}
