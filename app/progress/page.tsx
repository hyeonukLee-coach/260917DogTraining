"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { cn } from "@/lib/utils";
import {
  computeStreak,
  computeWeeklyCompletion,
  getLocalDateString,
  getTodayMissions,
  getWeekDayStatuses,
  DayStatus,
} from "@/lib/progress";
import { useWellnessStore } from "@/store/useWellnessStore";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const DAY_STATUS_STYLES: Record<DayStatus, string> = {
  completed: "bg-cocoa text-paper",
  partial: "bg-amber-400/40 text-paper",
  missed: "bg-destructive/30 text-destructive",
  upcoming: "bg-sand text-muted-foreground",
  none: "bg-sand/40 text-muted-foreground",
};

export default function ProgressPage() {
  const router = useRouter();
  const isHydrated = useWellnessStore((state) => state.isHydrated);
  const dog = useWellnessStore((state) => state.dog);
  const plan = useWellnessStore((state) => state.plan);
  const activations = useWellnessStore((state) => state.activations);
  const records = useWellnessStore((state) => state.records);
  const hydrate = useWellnessStore((state) => state.hydrate);
  const reset = useWellnessStore((state) => state.reset);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && (!dog || !plan)) {
      router.replace("/profile");
    }
  }, [isHydrated, dog, plan, router]);

  const today = getLocalDateString();

  const todayMissions = useMemo(() => {
    if (!plan) return [];
    return getTodayMissions(plan.courses, activations, records, today);
  }, [plan, activations, records, today]);

  const streak = useMemo(() => {
    if (!plan) return 0;
    return computeStreak(plan.courses, activations, records, today);
  }, [plan, activations, records, today]);

  const weekly = useMemo(() => {
    if (!plan) return { completed: 0, scheduled: 0, rate: 0 };
    return computeWeeklyCompletion(plan.courses, activations, records, today);
  }, [plan, activations, records, today]);

  const weekDays = useMemo(() => {
    if (!plan) return [];
    return getWeekDayStatuses(plan.courses, activations, records, today);
  }, [plan, activations, records, today]);

  if (!isHydrated || !dog || !plan) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  const todayCompleted = todayMissions.filter((m) => m.record?.completed).length;
  const todayTotal = todayMissions.length;

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">STEP 6 · 변화 기록</p>
        <h1 className="text-2xl font-bold text-cocoa">{dog.name}의 웰니스 기록이에요</h1>
        <p className="text-sm text-muted-foreground">
          꾸준함이 쌓이면 변화가 보여요. 내일 다시 방문하면 다음 날 미션이 열려요.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">오늘 완료</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cocoa">
              {todayCompleted}
              <span className="text-base font-normal text-muted-foreground">/{todayTotal}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">연속 수행일</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1.5 text-2xl font-bold text-cocoa">
              <Flame className="h-5 w-5" />
              {streak}일
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>이번 주 완료율</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-cocoa transition-all"
              style={{ width: `${weekly.rate}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {weekly.completed}/{weekly.scheduled}개 미션 완료 · {weekly.rate}%
          </p>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {weekDays.map((day, index) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                    DAY_STATUS_STYLES[day.status]
                  )}
                >
                  {day.date === today ? "오늘" : DAY_LABELS[index]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="button" onClick={() => router.push("/missions")}>
        오늘의 미션으로 돌아가기
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          reset();
          router.push("/");
        }}
      >
        새로운 반려견으로 다시 시작하기
      </Button>
    </MotionDiv>
  );
}
