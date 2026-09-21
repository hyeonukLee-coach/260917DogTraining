// 교육 영상 카탈로그(trainingVideos 컬렉션)를 Firestore에 올리는 1회성 관리자 스크립트.
//
// 클라이언트는 firestore.rules에서 trainingVideos에 쓰기가 막혀 있으므로,
// 이 스크립트는 Firebase Admin SDK(서비스 계정)로 규칙을 우회해 데이터를 올린다.
// data/trainingVideos.seed.json의 내용을 고정 id로 upsert하므로 여러 번 실행해도
// 안전하다(중복 생성되지 않음).
//
// 사용법:
//   1) Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"으로
//      JSON 키 파일을 내려받는다.
//   2) 아래처럼 환경 변수로 경로를 지정하고 실행한다.
//        GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seedTrainingVideos.mjs
//   3) 영상을 직접 추가/수정하려면 data/trainingVideos.seed.json을 편집한 뒤
//      다시 실행하면 된다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", "data", "trainingVideos.seed.json");
const videos = JSON.parse(readFileSync(seedPath, "utf-8"));

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const app = initializeApp({
  credential: serviceAccountPath ? cert(JSON.parse(readFileSync(serviceAccountPath, "utf-8"))) : applicationDefault(),
});

const db = getFirestore(app);

async function main() {
  const batch = db.batch();
  for (const video of videos) {
    const { id, ...rest } = video;
    batch.set(db.collection("trainingVideos").doc(id), rest, { merge: true });
  }
  await batch.commit();
  console.log(`trainingVideos ${videos.length}건을 올렸습니다.`);
}

main().catch((err) => {
  console.error("시드 실행 중 오류가 발생했습니다:", err);
  process.exit(1);
});
