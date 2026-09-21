"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdminNoteFormProps {
  initialTitle?: string;
  initialContent?: string;
  submitLabel: string;
  onSubmit: (values: { title: string; content: string }) => Promise<void>;
  onCancel?: () => void;
}

export function AdminNoteForm({
  initialTitle = "",
  initialContent = "",
  submitLabel,
  onSubmit,
  onCancel,
}: AdminNoteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      setError("제목을 입력해주세요");
      return;
    }
    if (!trimmedContent) {
      setError("내용을 입력해주세요");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ title: trimmedTitle, content: trimmedContent });
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-title">제목</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 커리큘럼 원본(노션)"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-content">내용</Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="노션·워드 파일의 내용을 붙여넣어주세요"
          rows={8}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "저장 중..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
