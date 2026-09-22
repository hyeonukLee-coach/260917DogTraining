"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, PlayCircle, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MissionCard } from "@/components/MissionCard";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { isAdminEmail } from "@/lib/admin";
import { currentCurriculumDay, getDayStatus, missionDueDate } from "@/lib/progress";
import { useAuthStore } from "@/store/useAuthStore";
import { useWellnessStore } from "@/store/useWellnessStore";
import { CurriculumDay } from "@/types/wellness";

export default function DogDetailPage() {
  const params = useParams<{ dogId: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  const currentDog = useWellnessStore((state) => state.currentDog);
  const currentCurriculum = useWellnessStore((state) => state.currentCurriculum);
  const currentRecords = useWellnessStore((state) => state.currentRecords);
  const isLoadingCurrentDog = useWellnessStore((state) => state.isLoadingCurrentDog);
  const loadDogDetail = useWellnessStore((state) => state.loadDogDetail);
  const clearCurrentDog = useWellnessStore((state) => state.clearCurrentDog);

  const [openWeek, setOpenWeek] = useState<string>("");

  useEffect(() => {
    loadDogDetail(params.dogId);
    return () => clearCurrentDog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dogId]);

  const weeks = useMemo<CurriculumDay[][]>(() => {
    if (!currentCurriculum) return [];
    const grouped: CurriculumDay[][] = [];
    for (let w = 0; w < currentCurriculum.weeks; w++) {
      grouped.push(currentCurriculum.days.slice(w * 7, w * 7 + 7));
    }
    return grouped;
  }, [currentCurriculum]);

  useEffect(() => {
    if (currentCurriculum) {
      const todayDay = currentCurriculumDay(currentCurriculum);
      setOpenWeek(`week-${Math.ceil(todayDay / 7)}`);
    }
  }, [currentCurriculum]);

  if (isAuthLoading || isLoadingCurrentDog) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">먼저 로그인해주세요.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/dogs")}>
          내 강아지로 돌아가기
        </Button>
      </main>
    );
  }

  if (!currentDog || !currentCurriculum) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">강아지 정보를 찾을 수 없어요.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/dogs")}>
          내 강아지로 돌아가기
        </Button>
      </main>
    );
  }

  const isOwner = currentDog.ownerUid === user.uid;
  const admin = isAdminEmail(user.email);
  if (!isOwner && !admin) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">이 강아지 정보를 볼 권한이 없어요.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/dogs")}>
          내 강아지로 돌아가기
        </Button>
      </main>
    );
  }

  const handleCertify = (day: CurriculumDay) => {
    const mission = day.items[0];
    if (!mission) return;
    const dueDate = missionDueDate(currentCurriculum.startDate, day.day);
    const searchParams = new URLSearchParams({
      tab: "mission",
      dogId: currentDog.id,
      dogName: currentDog.name,
      day: String(day.day),
      missionId: mission.id,
      dueDate,
    });
    router.push(`/community?${searchParams.toString()}`);
  };

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      {!isOwner && admin && (
        <div className="rounded-xl border border-cocoa/30 bg-cocoa/10 px-4 py-2 text-xs font-medium text-cocoa">
          관리자 권한으로 보고 있어요.
        </div>
      )}

      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-cocoa">{currentDog.name}의 웰니스 커리큘럼</p>
          {currentCurriculum.source === "ai" ? (
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
        <h1 className="text-2xl font-bold text-cocoa">
          {currentCurriculum.weeks}주 · {currentCurriculum.totalDays}일 통합 커리큘럼
        </h1>
      </header>

      {currentCurriculum.needsVetNotice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            입력하신 건강 특이사항을 고려해 커리큘럼을 조정했어요. 건강 상태에 따라 전문가 또는
            수의사 상담이 필요할 수 있습니다.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>현재 상태 &amp; 배합 이유</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>{currentCurriculum.currentStateSummary}</p>
          <p>{currentCurriculum.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {currentCurriculum.priorityAreas.map((goal, index) => (
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

      <div className="flex flex-wrap gap-2">
        {(isOwner || admin) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dogs/${currentDog.id}/progress`)}
          >
            <BarChart3 className="h-4 w-4" />
            달성률 통계 보기
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => router.push(`/dogs/${currentDog.id}/videos`)}>
          <PlayCircle className="h-4 w-4" />
          교육 영상 프로그램
        </Button>
      </div>

      <Accordion type="single" collapsible value={openWeek} onValueChange={setOpenWeek}>
        {weeks.map((weekDays, index) => {
          const weekNumber = index + 1;
          const completedCount = weekDays.filter((d) =>
            getDayStatus(currentCurriculum, d.day, currentRecords) === "completed"
          ).length;

          return (
            <AccordionItem key={weekNumber} value={`week-${weekNumber}`} className="mb-3">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  {weekNumber}주차
                  <span className="text-xs font-normal text-muted-foreground">
                    {completedCount}/{weekDays.length}일 완료
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  {weekDays.map((day) => {
                    const mission = day.items[0];
                    if (!mission) return null;
                    const status = getDayStatus(currentCurriculum, day.day, currentRecords);
                    return (
                      <div key={day.day} className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground">{day.day}일차</p>
                        <MissionCard
                          mission={mission}
                          status={status}
                          onCertify={() => handleCertify(day)}
                        />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </MotionDiv>
  );
}
