import type {
  Comment,
  CommentsPage,
  CommentsProvider,
} from "@riebeckite/plugin-comments";
import type { D1Database } from "./d1_types.js";

type CommentRow = {
  id: string;
  content_id: string;
  author_name: string;
  author_url: string | null;
  author_avatar_url: string | null;
  body: string;
  created_at: string;
  url: string | null;
};

export class D1CommentsStorage implements CommentsProvider {
  readonly capabilities: ReadonlySet<"read" | "write"> = new Set(["read"]);

  constructor(private readonly database: D1Database) {}

  async getComments(contentId: string, limit = 20): Promise<CommentsPage> {
    const countResult = await this.database
      .prepare(`SELECT COUNT(*) AS total FROM comments WHERE content_id = ?`)
      .bind(contentId)
      .first<{ total: number }>();

    const rowsResult = await this.database
      .prepare(
        `SELECT id, content_id, author_name, author_url, author_avatar_url,
                body, created_at, url
         FROM comments WHERE content_id = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(contentId, limit)
      .all<CommentRow>();

    const comments: Comment[] = rowsResult.results.map((row) => ({
      id: row.id,
      author: {
        name: row.author_name,
        url: row.author_url ?? undefined,
        avatarUrl: row.author_avatar_url ?? undefined,
      },
      body: row.body,
      createdAt: row.created_at,
      url: row.url ?? undefined,
    }));

    return {
      contentId,
      comments,
      total: countResult?.total ?? 0,
    };
  }
}

export function d1Storage(database: D1Database): D1CommentsStorage {
  return new D1CommentsStorage(database);
}
