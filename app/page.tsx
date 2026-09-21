import Link from "next/link";
import { HeartHandshake, PawPrint, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

const STATS = [
  { icon: PawPrint, label: "10,000회 이상 수업" },
  { icon: Users, label: "700가정 이상 케어" },
  { icon: HeartHandshake, label: "전문가 20명 이상 양성" },
];

export default function HomePage() {
  return (
    <main className="flex flex-col items-center gap-8 py-6 text-center">
      <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold tracking-wide text-cocoa">
        UNIPAWS AI WELLNESS
      </span>

      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold leading-snug text-cocoa">
          우리 강아지에게도
          <br />
          전담 AI 코치가 있다면?
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          10년의 현장 경험과 데이터를 기반으로
          <br />
          우리 강아지에게 필요한 교육·운동·생활관리를 찾아드립니다.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Link href="/profile" className="w-full">
          <Button type="button" size="lg" className="w-full">
            우리 강아지 웰니스 시작하기
          </Button>
        </Link>
        <Link href="/community" className="w-full">
          <Button type="button" variant="outline" className="w-full">
            커뮤니티 둘러보기
          </Button>
        </Link>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {STATS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-4"
          >
            <Icon className="h-5 w-5 text-cocoa" />
            <p className="text-xs leading-tight text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Google 로그인 후 3~5분이면 체험할 수 있어요. 강아지 정보는 이 브라우저에만 저장돼요.
      </p>
    </main>
  );
}
