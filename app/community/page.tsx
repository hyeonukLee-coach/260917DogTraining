"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { CommunityBoardList } from "@/components/community/CommunityBoardList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { POST_TYPE_LABELS, POST_TYPE_ORDER } from "@/lib/community";
import { PostType } from "@/types/community";

function CommunityPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab: PostType = POST_TYPE_ORDER.includes(tabParam as PostType)
    ? (tabParam as PostType)
    : "mission";
  const missionWeekParam = searchParams.get("week");
  const missionWeek = missionWeekParam ? Number(missionWeekParam) : undefined;
  const missionCourseTitle = searchParams.get("course") ?? undefined;

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-cocoa">커뮤니티</p>
            <h1 className="text-2xl font-bold text-cocoa">함께 키우는 이야기</h1>
          </div>
          <GoogleSignInButton />
        </div>
        <p className="text-sm text-muted-foreground">
          미션 인증 영상에 피드백을 남기거나, 자유롭게 질문하고 작은 성과를 나눠보세요.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid grid-cols-4">
          {POST_TYPE_ORDER.map((type) => (
            <TabsTrigger key={type} value={type}>
              {POST_TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>

        {POST_TYPE_ORDER.map((type) => (
          <TabsContent key={type} value={type}>
            <CommunityBoardList
              type={type}
              missionCourseTitle={type === "mission" ? missionCourseTitle : undefined}
              missionWeek={type === "mission" ? missionWeek : undefined}
              autoOpenCompose={type === "mission" && missionWeek !== undefined}
            />
          </TabsContent>
        ))}
      </Tabs>
    </MotionDiv>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </main>
      }
    >
      <CommunityPageContent />
    </Suspense>
  );
}
