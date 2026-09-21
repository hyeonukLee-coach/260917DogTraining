import { FirebaseApp, getApps, initializeApp } from "firebase/app";

/**
 * Firebase 웹 설정값은 비밀키가 아니라 "이 앱이 어느 프로젝트에 요청을 보내는지"를
 * 나타내는 공개 식별자다(공식 문서 기준). 실제 접근 제어는 Firestore 보안 규칙이
 * 담당하므로 그대로 커밋해도 안전하다.
 * https://firebase.google.com/docs/projects/api-keys
 */
const firebaseConfig = {
  apiKey: "AIzaSyDHYMIq4I_kmNq2G-im9xbYlg62Ur9EA1M",
  authDomain: "dogtraining-ai.firebaseapp.com",
  projectId: "dogtraining-ai",
  storageBucket: "dogtraining-ai.firebasestorage.app",
  messagingSenderId: "937967817300",
  appId: "1:937967817300:web:18abd26524ded9fb3913c1",
  measurementId: "G-JDNHRF766D",
};

export function getFirebaseApp(): FirebaseApp {
  const existing = getApps();
  return existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
}
