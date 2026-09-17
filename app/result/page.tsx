"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurriculumItemCard } from "@/components/CurriculumItemCard";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { useCurriculumStore } from "@/store/useCurriculumStore";

export default function ResultPage() {
  const router = useRouter();
  const isHydrated = useCurriculumStore((state) => state.isHydrated);
  const profile = useCurriculumStore((state) => state.profile);
  const curriculum = useCurriculumStore((state) => state.curriculum);
  const hydrate = useCurriculumStore((state) => state.hydrate);
  const reset = useCurriculumStore((state) => state.reset);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !curriculum) {
      router.replace("/");
    }
  }, [isHydrated, curriculum, router]);

  if (!isHydrated || !curriculum || !profile) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  const handleRestart = () => {
    reset();
    router.push("/");
  };

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold text-cocoa">{profile.name}의 7일 커리큘럼</h1>
        <p className="text-sm text-muted-foreground">
          입력하신 정보를 바탕으로 만든 맞춤 커리큘럼이에요. Day를 눌러 확인해보세요.
        </p>
      </header>

      {curriculum.needsVetNotice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-700/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            입력하신 신체 특이사항을 고려해 커리큘럼을 조정했어요. 건강 상태에 따라 전문가 또는
            수의사 상담이 필요할 수 있습니다.
          </p>
        </div>
      )}

      <Tabs defaultValue="1" className="w-full">
        <TabsList>
          {curriculum.days.map((day) => (
            <TabsTrigger key={day.day} value={String(day.day)}>
              Day {day.day}
            </TabsTrigger>
          ))}
        </TabsList>

        {curriculum.days.map((day) => (
          <TabsContent key={day.day} value={String(day.day)} className="flex flex-col gap-4">
            {day.items.map((item) => (
              <CurriculumItemCard key={item.id} item={item} />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Button variant="outline" onClick={handleRestart} className="mt-2">
        정보 다시 입력하기
      </Button>
    </MotionDiv>
  );
}
