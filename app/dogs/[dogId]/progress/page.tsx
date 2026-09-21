"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flame, ShieldAlert, Target, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { cn } from "@/lib/utils";
import { isAdminEmail } from "@/lib/admin";
import { computeCurriculumStats, getDayStatus, missionDueDate, DayCertStatus } from "@/lib/progress";
import { useAuthStore } from "@/store/useAuthStore";
import { useWellnessStore } from "@/store/useWellnessStore";

const STATUS_LABELS: Record<DayCertStatus, string> = {
  completed: "완료",
  uncertified: "미인증",
  today: "오늘",
  upcoming: "예정",
};

const STATUS_STYLES: Record<DayCertStatus, string> = {
  completed: "text-cocoa",
  uncertified: "text-destructive",
  today: "text-amber-400",
  upcoming: "text-muted-foreground",
};

export default function DogProgressPage() {
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

  useEffect(() => {
    loadDogDetail(params.dogId);
    return () => clearCurrentDog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dogId]);

  const stats = useMemo(() => {
    if (!currentCurriculum) return null;
    return computeCurriculumStats(currentCurriculum, currentRecords);
  }, [currentCurriculum, currentRecords]);

  if (isAuthLoading || isLoadingCurrentDog) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  if (!user || !currentDog || !currentCurriculum) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">정보를 찾을 수 없어요.</p>
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
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">이 통계는 강아지의 보호자와 관리자만 볼 수 있어요.</p>
        <Button type="button" variant="outline" onClick={() => router.push(`/dogs/${currentDog.id}`)}>
          커리큘럼으로 돌아가기
        </Button>
      </main>
    );
  }

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">
          {isOwner ? "나만 볼 수 있는 통계" : "관리자 통계"}
        </p>
        <h1 className="text-2xl font-bold text-cocoa">{currentDog.name}의 미션 달성 통계</h1>
        <p className="text-sm text-muted-foreground">
          꾸준함이 눈에 보이면 동기부여가 돼요. 이 표는 {currentDog.name}의 보호자와 관리자만 볼 수 있어요.
        </p>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                미션 달성률
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cocoa">{stats.achievementRate}%</p>
              <p className="text-xs text-muted-foreground">
                {stats.completedCount}/{stats.dueDaysCount}일 완료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                미인증률
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{stats.uncertifiedRate}%</p>
              <p className="text-xs text-muted-foreground">{stats.uncertifiedCount}일 미인증</p>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame className="h-4 w-4" />
                연속 인증일수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cocoa">{stats.currentStreak}일 연속</p>
              <p className="text-xs text-muted-foreground">
                전체 {stats.totalDays}일 중 {stats.dueDaysCount}일이 기한 도달
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>일차별 인증 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">일차</th>
                  <th className="py-2 pr-3 font-medium">인증 예정일</th>
                  <th className="py-2 pr-3 font-medium">미션</th>
                  <th className="py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {currentCurriculum.days.map((day) => {
                  const status = getDayStatus(currentCurriculum, day.day, currentRecords);
                  const dueDate = missionDueDate(currentCurriculum.startDate, day.day);
                  return (
                    <tr key={day.day} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground">{day.day}일차</td>
                      <td className="py-2 pr-3 text-muted-foreground">{dueDate}</td>
                      <td className="py-2 pr-3">{day.items[0]?.name ?? "-"}</td>
                      <td className={cn("py-2 font-semibold", STATUS_STYLES[status])}>
                        {STATUS_LABELS[status]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Button type="button" variant="outline" onClick={() => router.push(`/dogs/${currentDog.id}`)}>
        커리큘럼으로 돌아가기
      </Button>
    </MotionDiv>
  );
}
