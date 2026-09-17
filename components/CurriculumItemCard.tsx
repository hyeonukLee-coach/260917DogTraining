import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { hoverScaleProps, MotionDiv } from "@/components/motion";
import { CurriculumItem } from "@/types/curriculum";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<CurriculumItem["type"], string> = {
  운동: "bg-cocoa/15 text-cocoa",
  교육: "bg-amber-400/15 text-amber-300",
};

export function CurriculumItemCard({ item }: { item: CurriculumItem }) {
  return (
    <MotionDiv {...hoverScaleProps}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                TYPE_STYLES[item.type]
              )}
            >
              {item.type}
            </span>
            <span className="rounded-full bg-sand/70 px-2.5 py-0.5 text-xs font-medium text-cocoa/80">
              {item.difficulty}
            </span>
            {item.purposeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
          <h3 className="mt-1 text-lg font-bold text-cocoa">{item.name}</h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold text-cocoa">왜 필요한가요?</p>
            <p className="mt-0.5 text-muted-foreground">{item.description}</p>
          </div>
          <div>
            <p className="font-semibold text-cocoa">어떻게 하나요?</p>
            <p className="mt-0.5 text-muted-foreground">{item.method}</p>
          </div>
          <div>
            <p className="font-semibold text-cocoa">주의할 점</p>
            <p className="mt-0.5 text-muted-foreground">{item.caution}</p>
          </div>
        </CardContent>
      </Card>
    </MotionDiv>
  );
}
