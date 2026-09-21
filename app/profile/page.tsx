"use client";

import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/ProfileForm";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { useAuthStore } from "@/store/useAuthStore";

function LoginGate() {
  const isSigningIn = useAuthStore((state) => state.isSigningIn);
  const error = useAuthStore((state) => state.error);
  const signIn = useAuthStore((state) => state.signIn);

  return (
    <MotionDiv {...fadeInProps}>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cocoa/15">
            <LogIn className="h-6 w-6 text-cocoa" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold text-cocoa">먼저 Google로 로그인해주세요</p>
            <p className="text-sm text-muted-foreground">
              로그인하면 나중에 미션 인증 영상을 올리고 커뮤니티에서 피드백을 주고받을 수
              있어요. 강아지 정보는 여전히 이 브라우저에만 저장돼요.
            </p>
          </div>
          <Button type="button" size="lg" disabled={isSigningIn} onClick={() => void signIn()}>
            {isSigningIn ? "로그인 중..." : "Google로 로그인하고 시작하기"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </MotionDiv>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-cocoa">STEP 2 · 반려견 정보 입력</p>
        <h1 className="text-2xl font-bold text-cocoa">우리 강아지를 소개해주세요</h1>
        <p className="text-sm text-muted-foreground">
          입력하신 정보를 바탕으로 맞춤 웰니스 플랜을 만들어드려요.
        </p>
      </header>

      {isAuthLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : user ? (
        <ProfileForm />
      ) : (
        <LoginGate />
      )}
    </main>
  );
}
