"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fadeInProps, hoverScaleProps, MotionDiv } from "@/components/motion";
import { cn } from "@/lib/utils";
import { getVideoProgramState, saveVideoProgramState } from "@/lib/dataStore";
import { buildVideoProgram, fetchTrainingVideoCatalog } from "@/lib/recommendation/videoProgram";
import { useAuthStore } from "@/store/useAuthStore";
import { useWellnessStore } from "@/store/useWellnessStore";
import { TrainingVideo, VideoProgramState, VideoProgramWeek } from "@/types/community";

export default function DogVideosPage() {
  const params = useParams<{ dogId: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  const currentDog = useWellnessStore((state) => state.currentDog);
  const currentCurriculum = useWellnessStore((state) => state.currentCurriculum);
  const isLoadingCurrentDog = useWellnessStore((state) => state.isLoadingCurrentDog);
  const loadDogDetail = useWellnessStore((state) => state.loadDogDetail);
  const clearCurrentDog = useWellnessStore((state) => state.clearCurrentDog);

  const [catalog, setCatalog] = useState<TrainingVideo[] | null>(null);
  const [programState, setProgramState] = useState<VideoProgramState | null | undefined>(undefined);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    loadDogDetail(params.dogId);
    return () => clearCurrentDog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dogId]);

  useEffect(() => {
    if (!currentDog) return;
    setProgramState(getVideoProgramState(currentDog.id));
    fetchTrainingVideoCatalog().then(setCatalog);
  }, [currentDog]);

  const resolvedWeeks: VideoProgramWeek[] = useMemo(
    () =>
      (programState?.items ?? [])
        .map(({ week, videoId }) => {
          const video = catalog?.find((v) => v.id === videoId);
          return video ? { week, video } : null;
        })
        .filter((w): w is VideoProgramWeek => w !== null),
    [programState, catalog]
  );

  if (isAuthLoading || isLoadingCurrentDog || programState === undefined) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  if (!user || !currentDog || !currentCurriculum) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">강아지 정보를 찾을 수 없어요.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/dogs")}>
          내 강아지로 돌아가기
        </Button>
      </main>
    );
  }

  const handleBuildProgram = async () => {
    setIsBuilding(true);
    try {
      const videoCatalog = catalog ?? (await fetchTrainingVideoCatalog());
      const program = buildVideoProgram(currentCurriculum, videoCatalog);
      const state: VideoProgramState = {
        dogId: currentDog.id,
        weeks: currentCurriculum.weeks,
        items: program.map((p) => ({ week: p.week, videoId: p.video.id })),
        completedWeeks: [],
      };
      saveVideoProgramState(currentDog.id, state);
      setProgramState(state);
    } finally {
      setIsBuilding(false);
    }
  };

  const toggleWeekComplete = (week: number) => {
    if (!programState) return;
    const completedWeeks = programState.completedWeeks.includes(week)
      ? programState.completedWeeks.filter((w) => w !== week)
      : [...programState.completedWeeks, week];
    const next = { ...programState, completedWeeks };
    saveVideoProgramState(currentDog.id, next);
    setProgramState(next);
  };

  const nextWeek = resolvedWeeks.find((w) => !programState?.completedWeeks.includes(w.week));

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">교육 영상 프로그램</p>
        <h1 className="text-2xl font-bold text-cocoa">{currentDog.name}의 교육 영상 코스</h1>
        <p className="text-sm text-muted-foreground">
          {currentCurriculum.weeks}주 커리큘럼에 맞춰, 매주 하나씩 영상을 시청해요.
        </p>
      </header>

      {!programState ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <p className="text-sm text-muted-foreground">
              {currentDog.name}의 우선 관리 영역에 맞춰{" "}
              <strong className="text-cocoa">{currentCurriculum.weeks}주 과정</strong>의 영상 프로그램을
              만들어드려요.
            </p>
            <Button type="button" disabled={isBuilding} onClick={handleBuildProgram}>
              {isBuilding ? "만드는 중..." : "영상 프로그램 만들기"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {nextWeek && (
            <div className="flex items-center gap-2.5 rounded-xl border border-cocoa/40 bg-cocoa/10 px-4 py-3 text-sm text-cocoa">
              <PlayCircle className="h-4 w-4 shrink-0" />
              <p>
                이번 주 영상: <strong>{nextWeek.week}주차 · {nextWeek.video.title}</strong>
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {resolvedWeeks.map(({ week, video }) => {
              const completed = programState.completedWeeks.includes(week);
              return (
                <MotionDiv key={week} {...hoverScaleProps}>
                  <Card className={cn(completed && "border-cocoa/50")}>
                    <CardContent className="flex flex-col gap-2.5 pt-5">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-cocoa">
                          {week}주차
                        </span>
                        {completed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cocoa/15 px-2.5 py-0.5 text-xs font-semibold text-cocoa">
                            <CheckCircle2 className="h-3 w-3" />
                            시청 완료
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-cocoa">{video.title}</p>
                      <p className="text-sm text-muted-foreground">{video.description}</p>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium text-cocoa underline"
                      >
                        영상 보러가기
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <Button
                        type="button"
                        variant={completed ? "secondary" : "default"}
                        size="sm"
                        className="self-start"
                        onClick={() => toggleWeekComplete(week)}
                      >
                        {completed ? "완료 취소" : "시청 완료"}
                      </Button>
                    </CardContent>
                  </Card>
                </MotionDiv>
              );
            })}
          </div>
        </>
      )}

      <Button type="button" variant="outline" onClick={() => router.push(`/dogs/${currentDog.id}`)}>
        커리큘럼으로 돌아가기
      </Button>
    </MotionDiv>
  );
}
