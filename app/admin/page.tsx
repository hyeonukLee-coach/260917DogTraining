"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminNoteCard } from "@/components/admin/AdminNoteCard";
import { AdminNoteForm } from "@/components/admin/AdminNoteForm";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { isAdminEmail } from "@/lib/admin";
import { createAdminNote, deleteAdminNote, listAdminNotes, updateAdminNote } from "@/lib/firebase/adminNotes";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminNote } from "@/types/admin";

function SignInGate() {
  const isSigningIn = useAuthStore((state) => state.isSigningIn);
  const error = useAuthStore((state) => state.error);
  const signIn = useAuthStore((state) => state.signIn);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <ShieldAlert className="h-8 w-8 text-cocoa" />
        <p className="text-sm text-muted-foreground">관리자 전용 페이지예요. 먼저 로그인해주세요.</p>
        <Button type="button" disabled={isSigningIn} onClick={() => void signIn()}>
          {isSigningIn ? "로그인 중..." : "Google로 로그인"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function NotAdminNotice() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">이 계정은 관리자 권한이 없어요.</p>
      </CardContent>
    </Card>
  );
}

function AdminNotes({ authorUid, authorEmail }: { authorUid: string; authorEmail: string }) {
  const [notes, setNotes] = useState<AdminNote[] | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setNotes(await listAdminNotes());
    } catch {
      setError("메모를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {isComposing ? (
        <Card>
          <CardContent className="pt-5">
            <AdminNoteForm
              submitLabel="메모 추가"
              onCancel={() => setIsComposing(false)}
              onSubmit={async ({ title, content }) => {
                await createAdminNote({ authorUid, authorEmail, title, content });
                setIsComposing(false);
                await reload();
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Button type="button" variant="outline" className="self-start" onClick={() => setIsComposing(true)}>
          새 메모 추가
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notes === null && !error && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {notes?.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          아직 메모가 없어요. 노션·워드에 있던 내용을 붙여넣어보세요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {notes?.map((note) => (
          <AdminNoteCard
            key={note.id}
            note={note}
            onUpdate={async (noteId, values) => {
              await updateAdminNote(noteId, values);
              await reload();
            }}
            onDelete={async (noteId) => {
              await deleteAdminNote(noteId);
              await reload();
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const admin = isAdminEmail(user?.email);

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-cocoa">
          <ShieldCheck className="h-3.5 w-3.5" />
          관리자
        </p>
        <h1 className="text-2xl font-bold text-cocoa">관리자 메모</h1>
        <p className="text-sm text-muted-foreground">
          이 페이지는 관리자 계정으로만 접근할 수 있어요. 노션·워드에 있던 내용을 옮겨 적어두세요.
        </p>
      </header>

      {isAuthLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : !user ? (
        <SignInGate />
      ) : !admin ? (
        <NotAdminNotice />
      ) : (
        <AdminNotes authorUid={user.uid} authorEmail={user.email ?? ""} />
      )}
    </MotionDiv>
  );
}
