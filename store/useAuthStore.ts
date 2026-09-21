import { User as FirebaseUser } from "firebase/auth";
import { create } from "zustand";

import { getUserProfile, signInWithGoogle, signOutUser } from "@/lib/firebase/auth";
import { UserProfile } from "@/types/community";

interface AuthStore {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  /** 최초 로그인 상태 확인이 끝났는지 (깜빡임 방지용) */
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;

  setAuthState: (user: FirebaseUser | null) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isSigningIn: false,
  error: null,

  setAuthState: async (user) => {
    if (!user) {
      set({ user: null, profile: null, isLoading: false });
      return;
    }
    const profile = await getUserProfile(user.uid);
    set({ user, profile, isLoading: false });
  },

  signIn: async () => {
    set({ isSigningIn: true, error: null });
    try {
      await signInWithGoogle();
    } catch {
      set({ error: "로그인에 실패했어요. 잠시 후 다시 시도해주세요." });
    } finally {
      set({ isSigningIn: false });
    }
  },

  signOut: async () => {
    await signOutUser();
    set({ user: null, profile: null });
  },
}));
