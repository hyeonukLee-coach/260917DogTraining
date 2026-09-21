"use client";

import { CheckCircle2, Clock, Lock } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hoverScaleProps, MotionDiv } from "@/components/motion";
import { cn } from "@/lib/utils";
import { DayCertStatus } from "@/lib/progress";
import { Mission, MissionCategory } from "@/types/wellness";

const CATEGORY_STYLES: Record<MissionCategory, string> = {
  운동: "bg-cocoa/15 text-cocoa",
  교육: "bg-amber-400/15 text-amber-300",
  생활관리: "bg-emerald-400/15 text-emerald-300",
};

const STATUS_META: Record<
  DayCertStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  completed: { label: "미션완료", className: "bg-cocoa/15 text-cocoa", icon: CheckCircle2 },
  uncertified: { label: "미인증", className: "bg-destructive/15 text-destructive", icon: Clock },
  today: { label: "오늘의 미션", className: "bg-amber-400/15 text-amber-300", icon: Clock },
  upcoming: { label: "예정", className: "bg-muted text-muted-foreground", icon: Lock },
};

interface MissionCardProps {
  mission: Mission;
  status: DayCertStatus;
  onCertify?: () => void;
}

export function MissionCard({ mission, status, onCertify }: MissionCardProps) {
  const statusMeta = STATUS_META[status];
  const StatusIcon = statusMeta.icon;

  return (
    <MotionDiv {...hoverScaleProps}>
      <Card className={cn(status === "completed" && "border-cocoa/50")}>
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
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                statusMeta.className
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {statusMeta.label}
            </span>
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

          {status === "completed" ? (
            <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-cocoa/15 px-3 py-1.5 text-sm font-semibold text-cocoa">
              <CheckCircle2 className="h-4 w-4" />
              미션완료
            </span>
          ) : status === "upcoming" ? (
            <Button type="button" size="sm" variant="outline" disabled className="mt-1 self-start">
              아직 시작 전이에요
            </Button>
          ) : (
            <Button type="button" size="sm" className="mt-1 self-start" onClick={onCertify}>
              미션 인증하러 가기
            </Button>
          )}
        </CardContent>
      </Card>
    </MotionDiv>
  );
}
