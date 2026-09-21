"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fadeInProps, hoverScaleProps, MotionDiv } from "@/components/motion";
import { cn } from "@/lib/utils";
import { getVideoProgramState, saveVideoProgramState } from "@/lib/dataStore";
import {
  buildVideoProgram,
  fetchTrainingVideoCatalog,
  ProgramLength,
  recommendProgramWeeks,
} from "@/lib/recommendation/videoProgram";
import { useWellnessStore } from "@/store/useWellnessStore";
import { TrainingVideo, VideoProgramState, VideoProgramWeek } from "@/types/community";

export default function EducationVideosPage() {
  const router = useRouter();
  const isHydrated = useWellnessStore((state) => state.isHydrated);
  const dog = useWellnessStore((state) => state.dog);
  const plan = useWellnessStore((state) => state.plan);
  const hydrate = useWellnessStore((state) => state.hydrate);

  const [catalog, setCatalog] = useState<TrainingVideo[] | null>(null);
  const [programState, setProgramState] = useState<VideoProgramState | null | undefined>(undefined);
  const [selectedWeeks, setSelectedWeeks] = useState<ProgramLength>(4);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && (!dog || !plan)) {
      router.replace("/profile");
    }
  }, [isHydrated, dog, plan, router]);

  const eduCourse = useMemo(
    () => plan?.courses.find((c) => c.category === "교육") ?? null,
    [plan]
  );

  useEffect(() => {
    if (!eduCourse || !plan) return;
    setProgramState(getVideoProgramState(eduCourse.id));
    setSelectedWeeks(recommendProgramWeeks(plan.assessment));
    fetchTrainingVideoCatalog().then(setCatalog);
  }, [eduCourse, plan]);

  if (!isHydrated || !dog || !plan || !eduCourse || programState === undefined) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  const handleBuildProgram = async () => {
    setIsBuilding(true);
    try {
      const videoCatalog = catalog ?? (await fetchTrainingVideoCatalog());
      const program = buildVideoProgram(eduCourse, videoCatalog, selectedWeeks);
      const state: VideoProgramState = {
        courseId: eduCourse.id,
        weeks: selectedWeeks,
        items: program.map((p) => ({ week: p.week, videoId: p.video.id })),
        completedWeeks: [],
      };
      saveVideoProgramState(eduCourse.id, state);
      setProgramState(state);
    } finally {
      setIsBuilding(false);
    }
  };

  const resolvedWeeks: VideoProgramWeek[] = (programState?.items ?? [])
    .map(({ week, videoId }) => {
      const video = catalog?.find((v) => v.id === videoId);
      return video ? { week, video } : null;
    })
    .filter((w): w is VideoProgramWeek => w !== null);

  const toggleWeekComplete = (week: number) => {
    if (!programState) return;
    const completedWeeks = programState.completedWeeks.includes(week)
      ? programState.completedWeeks.filter((w) => w !== week)
      : [...programState.completedWeeks, week];
    const next = { ...programState, completedWeeks };
    saveVideoProgramState(eduCourse.id, next);
    setProgramState(next);
  };

  const nextWeek = resolvedWeeks.find((w) => !programState?.completedWeeks.includes(w.week));

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">교육 영상 프로그램</p>
        <h1 className="text-2xl font-bold text-cocoa">{dog.name}의 교육 영상 코스</h1>
        <p className="text-sm text-muted-foreground">
          매주 하나씩, 우리 강아지 교육 커리큘럼에 맞는 영상을 시청해요.
        </p>
      </header>

      {!programState ? (
        <Card>
          <CardHeader>
            <CardTitle>프로그램 기간 선택</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              입력하신 정보를 바탕으로{" "}
              <strong className="text-cocoa">{recommendProgramWeeks(plan.assessment)}주 과정</strong>을
              추천드려요. 원하는 기간으로 바꿔도 괜찮아요.
            </p>
            <RadioGroup
              value={String(selectedWeeks)}
              onValueChange={(v) => setSelectedWeeks(Number(v) as ProgramLength)}
              className="grid grid-cols-2 gap-3"
            >
              <label className="flex flex-col items-center gap-1 rounded-xl border border-input bg-sand px-3 py-3 text-sm font-medium">
                <RadioGroupItem value="4" id="weeks-4" />
                4주 과정
              </label>
              <label className="flex flex-col items-center gap-1 rounded-xl border border-input bg-sand px-3 py-3 text-sm font-medium">
                <RadioGroupItem value="8" id="weeks-8" />
                8주 과정
              </label>
            </RadioGroup>
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
                이번 주 미션: <strong>{nextWeek.week}주차 · {nextWeek.video.title}</strong>
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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={completed ? "secondary" : "default"}
                          size="sm"
                          onClick={() => toggleWeekComplete(week)}
                        >
                          {completed ? "완료 취소" : "시청 완료"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/community?tab=mission&week=${week}&course=${encodeURIComponent(eduCourse.title)}`
                            )
                          }
                        >
                          이 주차 미션 인증하기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </MotionDiv>
              );
            })}
          </div>
        </>
      )}
    </MotionDiv>
  );
}
