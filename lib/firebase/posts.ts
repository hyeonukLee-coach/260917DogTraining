import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/firestore";
import { Comment, Post, PostType, TrainingVideo } from "@/types/community";
import { MissionCategory } from "@/types/wellness";

const PAGE_SIZE = 20;

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
}

function mapPost(snap: QueryDocumentSnapshot<DocumentData>): Post {
  const data = snap.data();
  return {
    id: snap.id,
    type: data.type,
    authorUid: data.authorUid,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL ?? undefined,
    authorIsTrainer: data.authorIsTrainer === true,
    title: data.title,
    content: data.content,
    videoUrl: data.videoUrl ?? undefined,
    missionCourseTitle: data.missionCourseTitle ?? undefined,
    missionWeek: data.missionWeek ?? undefined,
    resolved: data.resolved === true,
    createdAt: toMillis(data.createdAt),
  };
}

function mapComment(postId: string, snap: QueryDocumentSnapshot<DocumentData>): Comment {
  const data = snap.data();
  return {
    id: snap.id,
    postId,
    authorUid: data.authorUid,
    authorName: data.authorName,
    authorIsTrainer: data.authorIsTrainer === true,
    text: data.text,
    createdAt: toMillis(data.createdAt),
  };
}

function mapTrainingVideo(snap: QueryDocumentSnapshot<DocumentData>): TrainingVideo {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    url: data.url,
    category: data.category,
    weekNumber: data.weekNumber,
    purposeTags: data.purposeTags ?? [],
    description: data.description ?? "",
  };
}

export interface CreatePostInput {
  type: PostType;
  authorUid: string;
  authorName: string;
  authorPhotoURL?: string;
  authorIsTrainer: boolean;
  title: string;
  content: string;
  videoUrl?: string;
  missionCourseTitle?: string;
  missionWeek?: number;
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const db = getFirestoreDb();
  const ref = await addDoc(collection(db, "posts"), {
    type: input.type,
    authorUid: input.authorUid,
    authorName: input.authorName,
    authorPhotoURL: input.authorPhotoURL ?? null,
    authorIsTrainer: input.authorIsTrainer,
    title: input.title,
    content: input.content,
    videoUrl: input.videoUrl ?? null,
    missionCourseTitle: input.missionCourseTitle ?? null,
    missionWeek: input.missionWeek ?? null,
    resolved: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export interface PostPage {
  posts: Post[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function listPosts(
  type: PostType,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<PostPage> {
  const db = getFirestoreDb();
  const constraints = [
    where("type", "==", type),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
  ];
  const q = cursor
    ? query(collection(db, "posts"), where("type", "==", type), orderBy("createdAt", "desc"), startAfter(cursor), limit(PAGE_SIZE))
    : query(collection(db, "posts"), ...constraints);

  const snap = await getDocs(q);
  const posts = snap.docs.map(mapPost);
  return {
    posts,
    cursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

export interface PostWithCounts extends Post {
  likeCount: number;
  commentCount: number;
}

export interface PostPageWithCounts {
  posts: PostWithCounts[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/** 목록 화면에서 카드마다 개별 요청하지 않도록 좋아요/댓글 수를 한 번에 묶어서 가져온다 */
export async function listPostsWithCounts(
  type: PostType,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<PostPageWithCounts> {
  const page = await listPosts(type, cursor);
  const posts = await Promise.all(
    page.posts.map(async (post) => {
      const [likeCount, commentCount] = await Promise.all([
        getLikeCount(post.id),
        getCommentCount(post.id),
      ]);
      return { ...post, likeCount, commentCount };
    })
  );
  return { posts, cursor: page.cursor, hasMore: page.hasMore };
}

export async function getPost(postId: string): Promise<Post | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) return null;
  return mapPost(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function setPostResolved(postId: string, resolved: boolean): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, "posts", postId), { resolved });
}

export async function deletePost(postId: string): Promise<void> {
  const db = getFirestoreDb();
  await deleteDoc(doc(db, "posts", postId));
}

export async function getLikeCount(postId: string): Promise<number> {
  const db = getFirestoreDb();
  const snap = await getCountFromServer(collection(db, "posts", postId, "likes"));
  return snap.data().count;
}

export async function hasUserLiked(postId: string, uid: string): Promise<boolean> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "posts", postId, "likes", uid));
  return snap.exists();
}

/** 좋아요를 토글하고, 토글 뒤의 새 좋아요 여부를 반환한다 */
export async function toggleLike(postId: string, uid: string): Promise<boolean> {
  const db = getFirestoreDb();
  const likeRef = doc(db, "posts", postId, "likes", uid);
  const liked = await hasUserLiked(postId, uid);
  if (liked) {
    await deleteDoc(likeRef);
    return false;
  }
  await setDoc(likeRef, { uid, createdAt: serverTimestamp() });
  return true;
}

export async function getCommentCount(postId: string): Promise<number> {
  const db = getFirestoreDb();
  const snap = await getCountFromServer(collection(db, "posts", postId, "comments"));
  return snap.data().count;
}

export async function listComments(postId: string): Promise<Comment[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapComment(postId, d));
}

export interface AddCommentInput {
  authorUid: string;
  authorName: string;
  authorIsTrainer: boolean;
  text: string;
}

export async function addComment(postId: string, input: AddCommentInput): Promise<string> {
  const db = getFirestoreDb();
  const ref = await addDoc(collection(db, "posts", postId, "comments"), {
    authorUid: input.authorUid,
    authorName: input.authorName,
    authorIsTrainer: input.authorIsTrainer,
    text: input.text,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listTrainingVideos(category?: MissionCategory): Promise<TrainingVideo[]> {
  const db = getFirestoreDb();
  const q = category
    ? query(collection(db, "trainingVideos"), where("category", "==", category), orderBy("weekNumber", "asc"))
    : query(collection(db, "trainingVideos"), orderBy("weekNumber", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(mapTrainingVideo);
}
