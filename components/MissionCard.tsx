"use client";

import { Check } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hoverScaleProps, MotionDiv } from "@/components/motion";
import { cn } from "@/lib/utils";
import { Mission, MissionCategory } from "@/types/wellness";

const CATEGORY_STYLES: Record<MissionCategory, string> = {
  운동: "bg-cocoa/15 text-cocoa",
  교육: "bg-amber-400/15 text-amber-300",
  생활관리: "bg-emerald-400/15 text-emerald-300",
};

interface MissionCardProps {
  mission: Mission;
  completed: boolean;
  onToggleComplete: (completed: boolean) => void;
}

export function MissionCard({ mission, completed, onToggleComplete }: MissionCardProps) {
  return (
    <MotionDiv {...hoverScaleProps}>
      <Card className={cn(completed && "border-cocoa/50")}>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                CATEGORY_STYLES[mission.category]
              )}
            >
              {mission.category}
            </span>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-cocoa/80">
              {mission.difficulty}
            </span>
            {mission.purposeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
          <h3 className="mt-1 flex items-center gap-1.5 text-lg font-bold text-cocoa">
            {mission.emoji && <span aria-hidden>{mission.emoji}</span>}
            {mission.name}
          </h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold text-cocoa">왜 필요한가요?</p>
            <p className="mt-0.5 text-muted-foreground">{mission.why}</p>
          </div>
          <div>
            <p className="font-semibold text-cocoa">어떻게 하나요?</p>
            <p className="mt-0.5 text-muted-foreground">{mission.how}</p>
          </div>
          <div>
            <p className="font-semibold text-cocoa">주의할 점</p>
            <p className="mt-0.5 text-muted-foreground">{mission.caution}</p>
          </div>

          <Button
            type="button"
            variant={completed ? "secondary" : "default"}
            size="sm"
            className="mt-1 self-start"
            onClick={() => onToggleComplete(!completed)}
          >
            {completed ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                미션 완료함
              </span>
            ) : (
              "미션 완료"
            )}
          </Button>
        </CardContent>
      </Card>
    </MotionDiv>
  );
}
