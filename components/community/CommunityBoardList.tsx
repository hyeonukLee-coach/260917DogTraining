"use client";

import { useEffect, useState } from "react";
import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { listPostsWithCounts, PostWithCounts } from "@/lib/firebase/posts";
import { PostType } from "@/types/community";

interface CommunityBoardListProps {
  type: PostType;
  dogId?: string;
  dogName?: string;
  curriculumDay?: number;
  missionId?: string;
  dueDate?: string;
  autoOpenCompose?: boolean;
}

export function CommunityBoardList({
  type,
  dogId,
  dogName,
  curriculumDay,
  missionId,
  dueDate,
  autoOpenCompose,
}: CommunityBoardListProps) {
  const [posts, setPosts] = useState<PostWithCounts[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await listPostsWithCounts(type);
      setPosts(page.posts);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch {
      setError("게시글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const page = await listPostsWithCounts(type, cursor);
      setPosts((prev) => [...prev, ...page.posts]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch {
      setError("게시글을 더 불러오지 못했어요.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PostComposer
        type={type}
        defaultTitle={
          curriculumDay !== undefined ? `${dogName ?? "우리 강아지"} ${curriculumDay}일차 미션 인증` : undefined
        }
        dogId={dogId}
        dogName={dogName}
        curriculumDay={curriculumDay}
        missionId={missionId}
        dueDate={dueDate}
        autoOpen={autoOpenCompose}
        onCreated={loadFirstPage}
      />

      {isLoading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isLoading && posts.length === 0 && !error && (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          아직 게시글이 없어요. 첫 글을 남겨보세요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <Button type="button" variant="outline" disabled={isLoadingMore} onClick={loadMore}>
          {isLoadingMore ? "불러오는 중..." : "더 보기"}
        </Button>
      )}
    </div>
  );
}
