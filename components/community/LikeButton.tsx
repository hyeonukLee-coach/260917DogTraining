"use client";

import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hasUserLiked, toggleLike } from "@/lib/firebase/posts";
import { useAuthStore } from "@/store/useAuthStore";

interface LikeButtonProps {
  postId: string;
  initialLikeCount: number;
}

export function LikeButton({ postId, initialLikeCount }: LikeButtonProps) {
  const user = useAuthStore((state) => state.user);
  const signIn = useAuthStore((state) => state.signIn);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikeCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    hasUserLiked(postId, user.uid).then(setLiked).catch(() => {});
  }, [postId, user]);

  const handleClick = async () => {
    if (!user) {
      await signIn();
      return;
    }
    if (pending) return;
    setPending(true);
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setCount((c) => c + (optimisticLiked ? 1 : -1));
    try {
      const actualLiked = await toggleLike(postId, user.uid);
      if (actualLiked !== optimisticLiked) {
        setLiked(actualLiked);
        setCount((c) => c + (actualLiked ? 1 : -1));
      }
    } catch {
      setLiked(!optimisticLiked);
      setCount((c) => c + (optimisticLiked ? -1 : 1));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant={liked ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      className={cn("gap-1.5", liked && "hover:bg-cocoa/90")}
    >
      <ThumbsUp className="h-4 w-4" />
      엄지척 {count}
    </Button>
  );
}
