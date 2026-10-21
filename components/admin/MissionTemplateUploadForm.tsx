"use client";

import { useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, FileText, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ParsedMissionCandidate,
  parseMissionsFromDocx,
  parseMissionsFromExcel,
  parsePurposeTagsText,
} from "@/lib/fileImport/parseMissionFile";
import { createMissionTemplatesBatch, NewMissionTemplateInput } from "@/lib/firebase/missionTemplates";
import { Difficulty, MissionCategory } from "@/types/wellness";

interface ReviewRow extends ParsedMissionCandidate {
  include: boolean;
}

function toReviewRows(candidates: ParsedMissionCandidate[]): ReviewRow[] {
  return candidates.map((c) => ({ ...c, include: true }));
}

interface MissionTemplateUploadFormProps {
  adminUid: string;
  onImported?: () => void;
}

export function MissionTemplateUploadForm({ adminUid, onImported }: MissionTemplateUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<"xlsx" | "docx" | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccessCount(null);
    setFileName(file.name);
    setIsParsing(true);

    try {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const isWord = /\.docx$/i.test(file.name);
      if (!isExcel && !isWord) {
        setError("엑셀(.xlsx) 또는 워드(.docx) 파일만 올릴 수 있어요.");
        setIsParsing(false);
        return;
      }

      const buffer = await file.arrayBuffer();
      const candidates = isExcel
        ? parseMissionsFromExcel(buffer)
        : await parseMissionsFromDocx(buffer);

      if (candidates.length === 0) {
        setError("파일에서 미션으로 쓸 내용을 찾지 못했어요. 양식을 확인해주세요.");
        setRows([]);
      } else {
        setRows(toReviewRows(candidates));
      }
      setSource(isExcel ? "xlsx" : "docx");
    } catch {
      setError("파일을 읽지 못했어요. 파일이 손상되지 않았는지 확인해주세요.");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateRow = (index: number, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleImport = async () => {
    setError(null);
    const included = rows.filter((r) => r.include);
    if (included.length === 0) {
      setError("가져올 항목을 1개 이상 선택해주세요.");
      return;
    }

    const invalidIndex = included.findIndex(
      (r) => !r.category || !r.difficulty || !r.name.trim() || !r.why.trim() || !r.how.trim() || !r.caution.trim()
    );
    if (invalidIndex >= 0) {
      setError("체크된 항목 중 카테고리·난이도·이름·왜·어떻게·주의사항이 빠진 항목이 있어요. 채워주세요.");
      return;
    }

    setIsImporting(true);
    try {
      const inputs: NewMissionTemplateInput[] = included.map((r) => ({
        category: r.category as MissionCategory,
        difficulty: r.difficulty as Difficulty,
        name: r.name.trim(),
        purposeTags: parsePurposeTagsText(r.purposeTagsText).tags,
        why: r.why.trim(),
        how: r.how.trim(),
        caution: r.caution.trim(),
        emoji: r.emoji.trim() || undefined,
        source: source ?? "xlsx",
      }));
      await createMissionTemplatesBatch(inputs, adminUid);
      setSuccessCount(inputs.length);
      setRows([]);
      setFileName("");
      onImported?.();
    } catch {
      setError("가져오기에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-cocoa/40 bg-sand/40 px-4 py-4 text-sm">
        <p className="font-medium text-cocoa">엑셀/워드 파일 업로드</p>
        <p className="text-xs text-muted-foreground">
          엑셀은 <strong>카테고리, 이름, 난이도, 태그, 왜, 어떻게, 주의사항</strong> 열을 포함해주세요
          (카테고리: 교육/운동/생활관리, 난이도: 초급/중급/고급). 워드는 제목 스타일로 쓴 부분을
          미션 이름으로 인식해요. 둘 다 가져오기 전에 내용을 검토·수정할 수 있어요.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={isParsing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {isParsing ? "읽는 중..." : "파일 선택"}
        </Button>
        {fileName && <p className="text-xs text-muted-foreground">선택한 파일: {fileName}</p>}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successCount !== null && (
        <p className="rounded-xl border border-cocoa/30 bg-cocoa/10 px-4 py-3 text-sm text-cocoa">
          {successCount}개의 미션을 가져왔어요. 이제 새 커리큘럼을 만들 때 함께 배합돼요.
        </p>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-cocoa">
            {source === "xlsx" ? (
              <FileSpreadsheet className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {rows.length}개 항목 검토 (체크 해제하면 가져오지 않아요)
          </div>

          {rows.map((row, index) => (
            <Card key={index} className={!row.include ? "opacity-50" : undefined}>
              <CardContent className="flex flex-col gap-2.5 pt-5">
                <label className="flex items-center gap-2 text-xs font-medium text-cocoa">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateRow(index, { include: e.target.checked })}
                  />
                  이 항목 가져오기
                </label>

                {row.warnings.length > 0 && (
                  <p className="text-xs text-amber-700">⚠ {row.warnings.join(" · ")}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">카테고리</Label>
                    <Select
                      value={row.category || undefined}
                      onValueChange={(v) => updateRow(index, { category: v as MissionCategory })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="교육">교육</SelectItem>
                        <SelectItem value="운동">운동</SelectItem>
                        <SelectItem value="생활관리">생활관리</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">난이도</Label>
                    <Select
                      value={row.difficulty || undefined}
                      onValueChange={(v) => updateRow(index, { difficulty: v as Difficulty })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="초급">초급</SelectItem>
                        <SelectItem value="중급">중급</SelectItem>
                        <SelectItem value="고급">고급</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">이름</Label>
                  <Input
                    className="h-9 text-sm"
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">태그 (쉼표로 구분)</Label>
                    <Input
                      className="h-9 text-xs"
                      value={row.purposeTagsText}
                      onChange={(e) => updateRow(index, { purposeTagsText: e.target.value })}
                      placeholder="예: 관계형성, 행동교육"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">이모지 (선택)</Label>
                    <Input
                      className="h-9 text-xs"
                      value={row.emoji}
                      onChange={(e) => updateRow(index, { emoji: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">왜 필요한가요?</Label>
                  <Textarea
                    className="min-h-[60px] text-xs"
                    value={row.why}
                    onChange={(e) => updateRow(index, { why: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">어떻게 하나요?</Label>
                  <Textarea
                    className="min-h-[60px] text-xs"
                    value={row.how}
                    onChange={(e) => updateRow(index, { how: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">주의할 점</Label>
                  <Textarea
                    className="min-h-[60px] text-xs"
                    value={row.caution}
                    onChange={(e) => updateRow(index, { caution: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" disabled={isImporting} onClick={handleImport}>
            {isImporting ? "가져오는 중..." : `선택한 ${rows.filter((r) => r.include).length}개 가져오기`}
          </Button>
        </div>
      )}
    </div>
  );
}
