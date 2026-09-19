"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { useWellnessStore } from "@/store/useWellnessStore";

export default function AnalysisPage() {
  const router = useRouter();
  const isHydrated = useWellnessStore((state) => state.isHydrated);
  const dog = useWellnessStore((state) => state.dog);
  const plan = useWellnessStore((state) => state.plan);
  const hydrate = useWellnessStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && (!dog || !plan)) {
      router.replace("/profile");
    }
  }, [isHydrated, dog, plan, router]);

  if (!isHydrated || !dog || !plan) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  const { assessment } = plan;

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">STEP 3 · AI 웰니스 분석 결과</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-cocoa">{dog.name}이를 위한 웰니스 플랜</h1>
          {assessment.source === "ai" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cocoa/15 px-2.5 py-0.5 text-xs font-semibold text-cocoa">
              <Sparkles className="h-3 w-3" />
              Gemini AI 분석
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              <Zap className="h-3 w-3" />
              빠른 분석
            </span>
          )}
        </div>
      </header>

      {assessment.needsVetNotice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-700/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            입력하신 건강 특이사항을 고려해 플랜을 조정했어요. 건강 상태에 따라 전문가 또는
            수의사 상담이 필요할 수 있습니다.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>현재 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{assessment.currentStateSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>보호자가 원하는 목표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {assessment.goals.map((goal) => (
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

      <Card>
        <CardHeader>
          <CardTitle>우선 관리 영역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {assessment.priorityAreas.map((goal, index) => (
              <span
                key={goal}
                className="inline-flex items-center gap-1 rounded-full bg-cocoa/15 px-2.5 py-0.5 text-xs font-semibold text-cocoa"
              >
                {index + 1}순위 · {goal}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>추천 교육</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{assessment.recommendedEducationSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>추천 운동</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{assessment.recommendedExerciseSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>추천 생활관리</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{assessment.recommendedLifestyleSummary}</p>
        </CardContent>
      </Card>

      {assessment.needsVetNotice && (
        <p className="text-xs text-muted-foreground">
          * 본 분석은 진단이나 치료를 대신하지 않으며, 건강 특이사항이 있는 경우 전문가 또는
          수의사와 상담해주세요.
        </p>
      )}

      <Button type="button" size="lg" className="mt-2" onClick={() => router.push("/courses")}>
        맞춤 코스 보러가기
      </Button>
    </MotionDiv>
  );
}
