"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CommentSection } from "@/components/community/CommentSection";
import { LikeButton } from "@/components/community/LikeButton";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { formatRelativeTime, POST_TYPE_LABELS } from "@/lib/community";
import { getLikeCount, getPost, setPostResolved } from "@/lib/firebase/posts";
import { useAuthStore } from "@/store/useAuthStore";
import { Post } from "@/types/community";

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [likeCount, setLikeCount] = useState(0);
  const [isTogglingResolved, setIsTogglingResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [fetchedPost, fetchedLikeCount] = await Promise.all([
        getPost(params.postId),
        getLikeCount(params.postId),
      ]);
      if (cancelled) return;
      setPost(fetchedPost);
      setLikeCount(fetchedLikeCount);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.postId]);

  if (post === undefined) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    );
  }

  if (post === null) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">게시글을 찾을 수 없어요.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/community")}>
          커뮤니티로 돌아가기
        </Button>
      </main>
    );
  }

  const isAuthor = user?.uid === post.authorUid;

  const handleToggleResolved = async () => {
    setIsTogglingResolved(true);
    try {
      const nextResolved = !post.resolved;
      await setPostResolved(post.id, nextResolved);
      setPost({ ...post, resolved: nextResolved });
    } finally {
      setIsTogglingResolved(false);
    }
  };

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-5">
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => router.push("/community")}>
        ← 커뮤니티로
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-cocoa">
              {POST_TYPE_LABELS[post.type]}
            </span>
            {post.dogName && post.curriculumDay && (
              <span className="rounded-full bg-cocoa/15 px-2.5 py-0.5 text-xs font-semibold text-cocoa">
                {post.dogName} · {post.curriculumDay}일차
              </span>
            )}
            {post.resolved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cocoa/15 px-2.5 py-0.5 text-xs font-semibold text-cocoa">
                <CheckCircle2 className="h-3 w-3" />
                완료
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-cocoa">{post.title}</h1>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-cocoa">{post.authorName}</span>
            {post.authorIsTrainer && (
              <span className="rounded-full bg-cocoa/15 px-1.5 py-0.5 text-[10px] font-semibold text-cocoa">
                훈련사
              </span>
            )}
            <span>· {formatRelativeTime(post.createdAt)}</span>
          </div>

          {post.videoUrl && (
            <a
              href={post.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-cocoa/30 bg-sand px-4 py-3 text-sm font-medium text-cocoa"
            >
              <Video className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">인증링크 보러가기</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          )}

          {post.type === "mission" ? (
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="font-semibold text-cocoa">오늘 진행한 교육&amp;운동 세부내용</p>
                <p className="mt-0.5 whitespace-pre-wrap text-foreground">{post.activityDetail}</p>
              </div>
              <div>
                <p className="font-semibold text-cocoa">반려견과 함께 하며 느낀점</p>
                <p className="mt-0.5 whitespace-pre-wrap text-foreground">{post.reflection}</p>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-foreground">{post.content}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <LikeButton postId={post.id} initialLikeCount={likeCount} />
            {isAuthor && (
              <Button
                type="button"
                variant={post.resolved ? "secondary" : "outline"}
                size="sm"
                disabled={isTogglingResolved}
                onClick={handleToggleResolved}
              >
                {post.resolved ? "완료 취소하기" : "피드백 완료 표시"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <CommentSection postId={post.id} />
    </MotionDiv>
  );
}
