/** 관리자만 볼 수 있는 메모. 노션/워드 등에 있던 내용을 옮겨 적어두는 용도 */
export interface AdminNote {
  id: string;
  title: string;
  content: string;
  authorUid: string;
  authorEmail: string;
  createdAt: number;
  updatedAt: number;
}
