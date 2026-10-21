"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadedMissionTemplate } from "@/lib/firebase/missionTemplates";

interface MissionTemplateListProps {
  templates: UploadedMissionTemplate[];
  onDelete: (templateId: string) => Promise<void>;
}

export function MissionTemplateList({ templates, onDelete }: MissionTemplateListProps) {
  if (templates.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        아직 업로드한 미션이 없어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardContent className="flex items-start justify-between gap-3 pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-cocoa">
                  {template.category}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {template.difficulty}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {template.source === "xlsx" ? "엑셀" : "워드"}
                </span>
              </div>
              <p className="font-medium text-cocoa">
                {template.emoji ? `${template.emoji} ` : ""}
                {template.name}
              </p>
              <p className="text-xs text-muted-foreground">{template.why}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(template.id)}
              aria-label="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
