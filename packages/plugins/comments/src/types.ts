export type CommentAuthor = {
  name: string;
  url?: string;
  avatarUrl?: string;
};

export type Comment = {
  id: string;
  author: CommentAuthor;
  body: string;
  createdAt: string;
  url?: string;
  reactions?: readonly { type: string; count: number }[];
};

export type CommentsPage = {
  contentId: string;
  comments: readonly Comment[];
  total: number;
};

export type CommentsOptions = {
  provider?: CommentsProvider;
  headingText?: string;
  className?: string;
  limit?: number;
  emptyText?: string;
};

export type ResolvedCommentsOptions = {
  provider: CommentsProvider;
  headingText: string;
  className: string;
  limit: number;
  emptyText: string;
};
