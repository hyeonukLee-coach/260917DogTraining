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
import { setMissionRecord } from "@/lib/firebase/dogs";
import { createPost } from "@/lib/firebase/posts";
import { useAuthStore } from "@/store/useAuthStore";
import { PostType } from "@/types/community";

const genericSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요").max(100, "제목은 100자 이내로 적어주세요"),
  content: z.string().trim().min(1, "내용을 입력해주세요").max(4000, "내용은 4000자 이내로 적어주세요"),
});

const missionSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요").max(100, "제목은 100자 이내로 적어주세요"),
  videoUrl: z
    .string()
    .trim()
    .min(1, "본인이 올린 인증 링크를 붙여넣어주세요")
    .refine(isLikelyUrl, "http(s)로 시작하는 링크를 입력해주세요"),
  activityDetail: z
    .string()
    .trim()
    .min(1, "오늘 진행한 교육&운동 세부내용을 적어주세요")
    .max(2000, "2000자 이내로 적어주세요"),
  reflection: z
    .string()
    .trim()
    .min(1, "반려견과 함께 하며 느낀점을 적어주세요")
    .max(2000, "2000자 이내로 적어주세요"),
});

type GenericFormValues = z.infer<typeof genericSchema>;
type MissionFormValues = z.infer<typeof missionSchema>;

interface PostComposerProps {
  type: PostType;
  defaultTitle?: string;
  /** 미션 인증 게시글만: 어떤 강아지의 몇 일차 미션인지 */
  dogId?: string;
  dogName?: string;
  curriculumDay?: number;
  missionId?: string;
  /** 이 미션의 인증 예정일(YYYY-MM-DD). 등록 성공 시 이 날짜로 미션완료 처리한다 */
  dueDate?: string;
  autoOpen?: boolean;
  onCreated?: () => void;
}

function GenericComposer({
  type,
  defaultTitle,
  onCancel,
  onCreated,
}: {
  type: PostType;
  defaultTitle?: string;
  onCancel: () => void;
  onCreated?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GenericFormValues>({
    resolver: zodResolver(genericSchema),
    defaultValues: { title: defaultTitle ?? "", content: "" },
  });

  const onSubmit = async (values: GenericFormValues) => {
    if (!user) return;
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
      });
      reset();
      onCancel();
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post-content">내용</Label>
            <Textarea
              id="post-content"
              placeholder="내용을 입력해주세요"
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
            <Button type="button" variant="ghost" onClick={onCancel}>
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MissionComposer({
  defaultTitle,
  dogId,
  dogName,
  curriculumDay,
  missionId,
  dueDate,
  onCancel,
  onCreated,
}: {
  defaultTitle?: string;
  dogId?: string;
  dogName?: string;
  curriculumDay?: number;
  missionId?: string;
  dueDate?: string;
  onCancel: () => void;
  onCreated?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MissionFormValues>({
    resolver: zodResolver(missionSchema),
    defaultValues: { title: defaultTitle ?? "", videoUrl: "", activityDetail: "", reflection: "" },
  });

  const onSubmit = async (values: MissionFormValues) => {
    if (!user) return;
    setError(null);
    try {
      await createPost({
        type: "mission",
        authorUid: user.uid,
        authorName: profile?.displayName ?? user.displayName ?? "익명의 보호자",
        authorPhotoURL: profile?.photoURL ?? user.photoURL ?? undefined,
        authorIsTrainer: profile?.isTrainer ?? false,
        title: values.title.trim(),
        videoUrl: values.videoUrl.trim(),
        activityDetail: values.activityDetail.trim(),
        reflection: values.reflection.trim(),
        dogId,
        dogName,
        curriculumDay,
      });

      if (dogId && missionId && dueDate) {
        await setMissionRecord(dogId, user.uid, missionId, dueDate, true);
      }

      reset();
      onCancel();
      onCreated?.();
    } catch {
      setError("글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        {dogName && curriculumDay && (
          <p className="rounded-xl bg-sand px-3 py-2 text-xs font-medium text-cocoa">
            {dogName}의 {curriculumDay}일차 미션 인증이에요. 등록하면 자동으로 미션완료로 표시돼요.
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mission-title">제목</Label>
            <Input id="mission-title" placeholder="제목을 입력해주세요" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mission-video">인증링크</Label>
            <Input
              id="mission-video"
              placeholder="https://youtu.be/... 또는 드라이브 공유 링크"
              {...register("videoUrl")}
            />
            {errors.videoUrl && <p className="text-xs text-destructive">{errors.videoUrl.message}</p>}
            <p className="text-xs text-muted-foreground">
              영상 파일은 유튜브(비공개/일부공개)나 드라이브에 먼저 올린 뒤, 그 링크를 붙여넣어주세요.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mission-activity">오늘 진행한 교육&amp;운동 세부내용</Label>
            <Textarea
              id="mission-activity"
              placeholder="오늘 어떤 교육·운동을 어떻게 진행했는지 적어주세요"
              rows={4}
              {...register("activityDetail")}
            />
            {errors.activityDetail && (
              <p className="text-xs text-destructive">{errors.activityDetail.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mission-reflection">반려견과 함께 하며 느낀점</Label>
            <Textarea
              id="mission-reflection"
              placeholder="오늘 반려견과 함께하며 느낀 점을 자유롭게 적어주세요"
              rows={4}
              {...register("reflection")}
            />
            {errors.reflection && (
              <p className="text-xs text-destructive">{errors.reflection.message}</p>
            )}
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
            <Button type="button" variant="ghost" onClick={onCancel}>
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PostComposer({
  type,
  defaultTitle,
  dogId,
  dogName,
  curriculumDay,
  missionId,
  dueDate,
  autoOpen = false,
  onCreated,
}: PostComposerProps) {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(autoOpen);

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
        {type === "mission" ? "미션 인증하기" : "새 글 쓰기"}
      </Button>
    );
  }

  if (type === "mission") {
    return (
      <MissionComposer
        defaultTitle={defaultTitle}
        dogId={dogId}
        dogName={dogName}
        curriculumDay={curriculumDay}
        missionId={missionId}
        dueDate={dueDate}
        onCancel={() => setOpen(false)}
        onCreated={onCreated}
      />
    );
  }

  return (
    <GenericComposer
      type={type}
      defaultTitle={defaultTitle}
      onCancel={() => setOpen(false)}
      onCreated={onCreated}
    />
  );
}
