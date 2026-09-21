"use client";

import { useEffect } from "react";

import { onAuthChange } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";

/** 앱 전역에서 한 번만 마운트되어 Firebase 로그인 상태를 zustand 스토어에 동기화한다 */
export function AuthProvider() {
  const setAuthState = useAuthStore((state) => state.setAuthState);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      void setAuthState(user);
    });
    return unsubscribe;
  }, [setAuthState]);

  return null;
}
