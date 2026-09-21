"use client";

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PostCard } from "@/components/community/PostCard";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { listPostsByAuthorWithCounts, PostWithCounts } from "@/lib/firebase/posts";
import { useAuthStore } from "@/store/useAuthStore";

function LoginGate() {
  const isSigningIn = useAuthStore((state) => state.isSigningIn);
  const error = useAuthStore((state) => state.error);
  const signIn = useAuthStore((state) => state.signIn);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cocoa/15">
          <LogIn className="h-6 w-6 text-cocoa" />
        </div>
        <p className="text-sm text-muted-foreground">내가 쓴 글을 모아보려면 먼저 로그인해주세요.</p>
        <Button type="button" size="lg" disabled={isSigningIn} onClick={() => void signIn()}>
          {isSigningIn ? "로그인 중..." : "Google로 로그인하기"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export default function MyPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  const [posts, setPosts] = useState<PostWithCounts[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listPostsByAuthorWithCounts(user.uid);
        if (!cancelled) setPosts(list);
      } catch {
        if (!cancelled) setError("게시글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <MotionDiv {...fadeInProps} className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-cocoa">마이페이지</p>
        <h1 className="text-2xl font-bold text-cocoa">내가 쓴 글 모아보기</h1>
        <p className="text-sm text-muted-foreground">
          미션 인증, 자유게시판, 질문, 작은 성과 등 내가 올린 모든 글을 한 곳에서 볼 수 있어요.
        </p>
      </header>

      {isAuthLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : !user ? (
        <LoginGate />
      ) : (
        <>
          {posts === null && !error && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {posts?.length === 0 && (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              아직 작성한 글이 없어요. 커뮤니티에 첫 글을 남겨보세요.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </MotionDiv>
  );
}
