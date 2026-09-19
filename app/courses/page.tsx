"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hoverScaleProps, fadeInProps, MotionDiv } from "@/components/motion";
import { useWellnessStore } from "@/store/useWellnessStore";

export default function CoursesPage() {
  const router = useRouter();
  const isHydrated = useWellnessStore((state) => state.isHydrated);
  const dog = useWellnessStore((state) => state.dog);
  const plan = useWellnessStore((state) => state.plan);
  const activations = useWellnessStore((state) => state.activations);
  const hydrate = useWellnessStore((state) => state.hydrate);
  const activateCourses = useWellnessStore((state) => state.activateCourses);

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

  const activatedIds = new Set(activations.map((a) => a.courseId));

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">STEP 4 · 맞춤 웰니스 코스</p>
        <h1 className="text-2xl font-bold text-cocoa">{dog.name}에게 맞는 7일 코스예요</h1>
        <p className="text-sm text-muted-foreground">
          시작할 코스를 골라주세요. 여러 개를 함께 시작할 수도 있어요.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {plan.courses.map((course) => {
          const started = activatedIds.has(course.id);
          return (
            <MotionDiv key={course.id} {...hoverScaleProps}>
              <Card className={started ? "border-cocoa/50" : undefined}>
                <CardHeader className="pb-2">
                  <span className="w-fit rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-cocoa">
                    {course.category}
                  </span>
                  <CardTitle>{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {course.matchedGoals.map((goal) => (
                      <span
                        key={goal}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        #{goal}
                      </span>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant={started ? "secondary" : "default"}
                    className="mt-1 self-start"
                    onClick={() => activateCourses([course.id])}
                    disabled={started}
                  >
                    {started ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4" />
                        시작됨
                      </span>
                    ) : (
                      "이 코스 시작하기"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </MotionDiv>
          );
        })}
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-2"
        disabled={activations.length === 0}
        onClick={() => router.push("/missions")}
      >
        {activations.length === 0 ? "코스를 먼저 시작해주세요" : "오늘의 미션 보러가기"}
      </Button>
    </MotionDiv>
  );
}
