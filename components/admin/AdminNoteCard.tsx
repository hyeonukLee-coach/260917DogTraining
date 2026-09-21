"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNoteForm } from "@/components/admin/AdminNoteForm";
import { formatRelativeTime } from "@/lib/community";
import { AdminNote } from "@/types/admin";

interface AdminNoteCardProps {
  note: AdminNote;
  onUpdate: (noteId: string, values: { title: string; content: string }) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

export function AdminNoteCard({ note, onUpdate, onDelete }: AdminNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("이 메모를 삭제할까요?")) return;
    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-5">
          <AdminNoteForm
            initialTitle={note.title}
            initialContent={note.content}
            submitLabel="수정 완료"
            onCancel={() => setIsEditing(false)}
            onSubmit={async (values) => {
              await onUpdate(note.id, values);
              setIsEditing(false);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{note.title}</CardTitle>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(note.updatedAt)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            수정
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={isDeleting} onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
