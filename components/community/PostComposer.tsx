"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { isLikelyUrl } from "@/lib/community";
import { createPost } from "@/lib/firebase/posts";
import { useAuthStore } from "@/store/useAuthStore";
import { PostType } from "@/types/community";

const baseSchema = {
  title: z.string().trim().min(1, "제목을 입력해주세요").max(100, "제목은 100자 이내로 적어주세요"),
  content: z.string().trim().min(1, "내용을 입력해주세요").max(4000, "내용은 4000자 이내로 적어주세요"),
  videoUrl: z.string().trim().optional(),
};

const missionSchema = z.object({
  ...baseSchema,
  videoUrl: z
    .string()
    .trim()
    .min(1, "본인이 올린 영상 링크를 붙여넣어주세요")
    .refine(isLikelyUrl, "http(s)로 시작하는 링크를 입력해주세요"),
});

const genericSchema = z.object(baseSchema);

interface PostComposerProps {
  type: PostType;
  defaultTitle?: string;
  missionCourseTitle?: string;
  missionWeek?: number;
  autoOpen?: boolean;
  onCreated?: () => void;
}

export function PostComposer({
  type,
  defaultTitle,
  missionCourseTitle,
  missionWeek,
  autoOpen = false,
  onCreated,
}: PostComposerProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [open, setOpen] = useState(autoOpen);
  const [error, setError] = useState<string | null>(null);

  const schema = type === "mission" ? missionSchema : genericSchema;
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: defaultTitle ?? "", content: "", videoUrl: "" },
  });

  if (!user) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            글을 쓰려면 먼저 Google로 로그인해주세요.
          </p>
          <GoogleSignInButton />
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {type === "mission" ? "미션 인증 영상 올리기" : "새 글 쓰기"}
      </Button>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await createPost({
        type,
        authorUid: user.uid,
        authorName: profile?.displayName ?? user.displayName ?? "익명의 보호자",
        authorPhotoURL: profile?.photoURL ?? user.photoURL ?? undefined,
        authorIsTrainer: profile?.isTrainer ?? false,
        title: values.title.trim(),
        content: values.content.trim(),
        videoUrl: "videoUrl" in values ? values.videoUrl?.trim() || undefined : undefined,
        missionCourseTitle: type === "mission" ? missionCourseTitle : undefined,
        missionWeek: type === "mission" ? missionWeek : undefined,
      });
      reset();
      setOpen(false);
      onCreated?.();
    } catch {
      setError("글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post-title">제목</Label>
            <Input id="post-title" placeholder="제목을 입력해주세요" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {type === "mission" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="post-video">영상 링크</Label>
              <Input
                id="post-video"
                placeholder="https://youtu.be/... 또는 드라이브 공유 링크"
                {...register("videoUrl")}
              />
              {"videoUrl" in errors && errors.videoUrl && (
                <p className="text-xs text-destructive">{errors.videoUrl.message as string}</p>
              )}
              <p className="text-xs text-muted-foreground">
                영상 파일은 유튜브(비공개/일부공개)나 드라이브에 먼저 올린 뒤, 그 링크를
                붙여넣어주세요.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post-content">내용</Label>
            <Textarea
              id="post-content"
              placeholder={
                type === "mission"
                  ? "이번 주 미션을 어떻게 진행했는지 적어주세요"
                  : "내용을 입력해주세요"
              }
              rows={5}
              {...register("content")}
            />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "등록하기"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
