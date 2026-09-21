"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MissionCard } from "@/components/MissionCard";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { getLocalDateString, getTodayMissions, isCourseFinished } from "@/lib/progress";
import { useWellnessStore } from "@/store/useWellnessStore";

export default function MissionsPage() {
  const router = useRouter();
  const isHydrated = useWellnessStore((state) => state.isHydrated);
  const dog = useWellnessStore((state) => state.dog);
  const plan = useWellnessStore((state) => state.plan);
  const activations = useWellnessStore((state) => state.activations);
  const records = useWellnessStore((state) => state.records);
  const hydrate = useWellnessStore((state) => state.hydrate);
  const toggleMissionComplete = useWellnessStore((state) => state.toggleMissionComplete);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!dog || !plan) {
      router.replace("/profile");
    } else if (activations.length === 0) {
      router.replace("/courses");
    }
  }, [isHydrated, dog, plan, activations, router]);

  const today = getLocalDateString();

  const todayMissions = useMemo(() => {
    if (!plan) return [];
    return getTodayMissions(plan.courses, activations, records, today);
  }, [plan, activations, records, today]);

  const finishedCourses = useMemo(() => {
    if (!plan) return [];
    return activations
      .map((activation) => plan.courses.find((c) => c.id === activation.courseId))
      .filter((course, index): course is NonNullable<typeof course> => {
        if (!course) return false;
        return isCourseFinished(course, activations[index], today);
      });
  }, [plan, activations, today]);

  if (!isHydrated || !dog || !plan || activations.length === 0) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">STEP 5 · 오늘의 미션</p>
        <h1 className="text-2xl font-bold text-cocoa">{dog.name}의 오늘 미션이에요</h1>
        <p className="text-sm text-muted-foreground">
          하나씩 완료하면서 {dog.name}의 웰니스 루틴을 만들어가요.
        </p>
      </header>

      {todayMissions.length === 0 && finishedCourses.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          오늘 예정된 미션이 없어요.
        </p>
      )}

      {finishedCourses.length > 0 && (
        <div className="flex flex-col gap-2">
          {finishedCourses.map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-2.5 rounded-xl border border-cocoa/40 bg-cocoa/10 px-4 py-3 text-sm text-cocoa"
            >
              <PartyPopper className="h-4 w-4 shrink-0" />
              <p>&quot;{course.title}&quot; 코스를 모두 완료했어요! 정보 다시 입력하기로 새 코스를 받아보세요.</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {todayMissions.map(({ course, mission, record }) => (
          <div key={mission.id} className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{course.title}</p>
            <MissionCard
              mission={mission}
              completed={record?.completed ?? false}
              onToggleComplete={(completed) => toggleMissionComplete(mission.id, completed)}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/progress")}>
          변화 기록 보러가기
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/community")}>
          커뮤니티에 미션 인증 영상 올리기
        </Button>
      </div>
    </MotionDiv>
  );
}
