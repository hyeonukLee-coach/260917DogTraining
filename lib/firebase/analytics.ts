import { Analytics, getAnalytics, isSupported, logEvent as firebaseLogEvent } from "firebase/analytics";

import { getFirebaseApp } from "@/lib/firebase/config";

let analyticsPromise: Promise<Analytics | null> | null = null;

/** 브라우저에서 Analytics를 지원할 때만(SSR·비지원 브라우저 제외) 초기화한다 */
function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) =>
      supported ? getAnalytics(getFirebaseApp()) : null
    );
  }
  return analyticsPromise;
}

/** Analytics 미지원 환경에서도 조용히 무시되는 안전한 로깅 헬퍼 */
export function logEvent(name: string, params?: Record<string, unknown>): void {
  getAnalyticsInstance()
    .then((analytics) => {
      if (analytics) firebaseLogEvent(analytics, name, params);
    })
    .catch(() => {
      // Analytics 초기화 실패는 앱 동작에 영향을 주지 않는다.
    });
}
