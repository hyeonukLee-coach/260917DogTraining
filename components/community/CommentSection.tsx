"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { formatRelativeTime } from "@/lib/community";
import { addComment, listComments } from "@/lib/firebase/posts";
import { useAuthStore } from "@/store/useAuthStore";
import { Comment } from "@/types/community";

interface CommentNode extends Comment {
  replies: CommentNode[];
}

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  comments.forEach((comment) => nodes.set(comment.id, { ...comment, replies: [] }));

  const roots: CommentNode[] = [];
  nodes.forEach((node) => {
    if (node.parentCommentId && nodes.has(node.parentCommentId)) {
      nodes.get(node.parentCommentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

const MAX_REPLY_DEPTH = 2;

function CommentItem({
  comment,
  postId,
  depth,
  onReplied,
}: {
  comment: CommentNode;
  postId: string;
  depth: number;
  onReplied: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReply = async () => {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 1000) {
      setError("답글은 1000자 이내로 작성해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await addComment(postId, {
        authorUid: user.uid,
        authorName: profile?.displayName ?? user.displayName ?? "익명의 보호자",
        authorIsTrainer: profile?.isTrainer ?? false,
        text: trimmed,
        parentCommentId: comment.id,
      });
      setText("");
      setReplying(false);
      onReplied();
    } catch {
      setError("답글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={depth > 0 ? "ml-4 border-l border-border pl-3 sm:ml-6" : undefined}>
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-cocoa">{comment.authorName}</span>
          {comment.authorIsTrainer && (
            <span className="rounded-full bg-cocoa/15 px-1.5 py-0.5 text-[10px] font-semibold text-cocoa">
              훈련사
            </span>
          )}
          <span>· {formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="mt-1 text-sm text-foreground">{comment.text}</p>
        {user && depth < MAX_REPLY_DEPTH && (
          <button
            type="button"
            className="mt-1.5 text-xs font-medium text-cocoa"
            onClick={() => setReplying((prev) => !prev)}
          >
            {replying ? "답글 취소" : "답글 달기"}
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-2 flex flex-col gap-2">
          <Textarea
            placeholder="답글을 남겨주세요"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="button"
            size="sm"
            className="self-start"
            disabled={isSubmitting}
            onClick={handleReply}
          >
            {isSubmitting ? "등록 중..." : "답글 남기기"}
          </Button>
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReplied={onReplied}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ postId }: { postId: string }) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const list = await listComments(postId);
    setComments(list);
  };

  useEffect(() => {
    reload().catch(() => setComments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const tree = useMemo(() => (comments ? buildCommentTree(comments) : []), [comments]);

  const handleSubmit = async () => {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 1000) {
      setError("댓글은 1000자 이내로 작성해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await addComment(postId, {
        authorUid: user.uid,
        authorName: profile?.displayName ?? user.displayName ?? "익명의 보호자",
        authorIsTrainer: profile?.isTrainer ?? false,
        text: trimmed,
      });
      setText("");
      await reload();
    } catch {
      setError("댓글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-cocoa">
        댓글 {comments === null ? "" : comments.length}
      </h2>

      {comments === null && <p className="text-sm text-muted-foreground">불러오는 중...</p>}

      <div className="flex flex-col gap-3">
        {tree.map((comment) => (
          <CommentItem key={comment.id} comment={comment} postId={postId} depth={0} onReplied={reload} />
        ))}
        {comments?.length === 0 && (
          <p className="text-sm text-muted-foreground">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
        )}
      </div>

      {user ? (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="따뜻한 피드백을 남겨주세요"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="button" size="sm" className="self-start" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "등록 중..." : "댓글 남기기"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">댓글을 남기려면 로그인해주세요.</p>
          <GoogleSignInButton />
        </div>
      )}
    </div>
  );
}
