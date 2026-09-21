"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

export function GoogleSignInButton() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isSigningIn = useAuthStore((state) => state.isSigningIn);
  const error = useAuthStore((state) => state.error);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);

  if (isLoading) {
    return <div className="h-10 w-32 animate-pulse rounded-xl bg-sand" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {profile?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoURL} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-sand" />
        )}
        <span className="text-sm font-medium text-cocoa">
          {profile?.displayName ?? user.displayName ?? "보호자"}
          {profile?.isTrainer && (
            <span className="ml-1 rounded-full bg-cocoa/15 px-1.5 py-0.5 text-[10px] font-semibold text-cocoa">
              훈련사
            </span>
          )}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size="sm" disabled={isSigningIn} onClick={() => void signIn()}>
        {isSigningIn ? "로그인 중..." : "Google로 로그인"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
