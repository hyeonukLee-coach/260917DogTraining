"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fadeInProps, hoverScaleProps, MotionDiv } from "@/components/motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useWellnessStore } from "@/store/useWellnessStore";

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
              로그인하면 우리 강아지들의 웰니스 커리큘럼을 계정에 저장하고 이어서 볼 수 있어요.
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

export default function DogsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const dogs = useWellnessStore((state) => state.dogs);
  const isLoadingDogs = useWellnessStore((state) => state.isLoadingDogs);
  const loadDogs = useWellnessStore((state) => state.loadDogs);

  useEffect(() => {
    if (user) {
      loadDogs(user.uid);
    }
  }, [user, loadDogs]);

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">내 강아지</p>
        <h1 className="text-2xl font-bold text-cocoa">우리 강아지들이에요</h1>
        <p className="text-sm text-muted-foreground">
          강아지를 눌러 커리큘럼을 이어서 보거나, 새 강아지를 추가해보세요.
        </p>
      </header>

      {isAuthLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : !user ? (
        <LoginGate />
      ) : (
        <>
          <Button type="button" size="lg" onClick={() => router.push("/profile")}>
            <Plus className="h-4 w-4" />
            강아지 추가하기
          </Button>

          {isLoadingDogs && <p className="text-sm text-muted-foreground">불러오는 중...</p>}

          {!isLoadingDogs && dogs.length === 0 && (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              아직 등록된 강아지가 없어요. 먼저 강아지를 추가해주세요.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {dogs.map((dog) => (
              <MotionDiv key={dog.id} {...hoverScaleProps}>
                <Card
                  className="cursor-pointer"
                  onClick={() => router.push(`/dogs/${dog.id}`)}
                >
                  <CardContent className="flex flex-col gap-1 pt-5">
                    <h3 className="text-lg font-bold text-cocoa">{dog.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {dog.breed}
                      {dog.ageYears !== undefined ? ` · 약 ${dog.ageYears}세` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {dog.goals.map((goal) => (
                        <span
                          key={goal}
                          className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-cocoa"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>
            ))}
          </div>
        </>
      )}
    </MotionDiv>
  );
}
