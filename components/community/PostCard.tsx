import Link from "next/link";
import { CheckCircle2, MessageCircle, ThumbsUp, Video } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { hoverScaleProps, MotionDiv } from "@/components/motion";
import { formatRelativeTime } from "@/lib/community";
import { PostWithCounts } from "@/lib/firebase/posts";
import { cn } from "@/lib/utils";

export function PostCard({ post }: { post: PostWithCounts }) {
  return (
    <Link href={`/community/${post.id}`}>
      <MotionDiv {...hoverScaleProps}>
        <Card className={cn(post.resolved && "border-cocoa/50")}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {post.type === "mission" && post.missionWeek && (
                <span className="rounded-full bg-cocoa/15 px-2.5 py-0.5 text-xs font-semibold text-cocoa">
                  {post.missionWeek}주차
                </span>
              )}
              {post.resolved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cocoa/15 px-2.5 py-0.5 text-xs font-semibold text-cocoa">
                  <CheckCircle2 className="h-3 w-3" />
                  완료
                </span>
              )}
              {post.videoUrl && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Video className="h-3 w-3" />
                  영상
                </span>
              )}
            </div>
            <h3 className="mt-1 text-base font-bold text-cocoa">{post.title}</h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {post.authorName}
                {post.authorIsTrainer && (
                  <span className="rounded-full bg-cocoa/15 px-1.5 py-0.5 text-[10px] font-semibold text-cocoa">
                    훈련사
                  </span>
                )}
                <span>· {formatRelativeTime(post.createdAt)}</span>
              </span>
              <span className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {post.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.commentCount}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </MotionDiv>
    </Link>
  );
}
