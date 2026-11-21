import type {
  PageReactions,
  ReactionCount,
  ReactionsProvider,
  ReactionType,
} from "@riebeckite/plugin-reactions";
import { REACTION_TYPES } from "@riebeckite/plugin-reactions";
import type { D1Database } from "./d1_types.js";

type CountRow = {
  reaction_type: string;
  count: number;
};

type UserReactionRow = {
  reaction_type: string;
};

export class D1ReactionsStorage implements ReactionsProvider {
  readonly capabilities: ReadonlySet<"read" | "write"> = new Set([
    "read",
    "write",
  ]);

  constructor(private readonly database: D1Database) {}

  async getReactions(
    contentId: string,
    visitorKey?: string,
  ): Promise<PageReactions> {
    const countsResult = await this.database
      .prepare(
        `SELECT reaction_type, COUNT(*) AS count FROM reactions
         WHERE content_id = ? GROUP BY reaction_type`,
      )
      .bind(contentId)
      .all<CountRow>();

    const userResult = visitorKey
      ? await this.database
          .prepare(
            `SELECT reaction_type FROM reactions
             WHERE content_id = ? AND user_key = ?`,
          )
          .bind(contentId, visitorKey)
          .all<UserReactionRow>()
      : { results: [] as UserReactionRow[] };

    const userTypes = new Set(
      userResult.results.map((row) => row.reaction_type),
    );
    const countsByType = new Map(
      countsResult.results.map((row) => [row.reaction_type, row.count]),
    );

    const counts: ReactionCount[] = REACTION_TYPES.map((type) => ({
      type,
      count: countsByType.get(type) ?? 0,
      reacted: userTypes.has(type),
    }));

    return { contentId, counts };
  }

  async addReaction(
    contentId: string,
    type: ReactionType,
    visitorKey: string,
  ): Promise<PageReactions> {
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO reactions (content_id, user_key, reaction_type)
         VALUES (?, ?, ?)`,
      )
      .bind(contentId, visitorKey, type)
      .run();
    return this.getReactions(contentId, visitorKey);
  }

  async removeReaction(
    contentId: string,
    type: ReactionType,
    visitorKey: string,
  ): Promise<PageReactions> {
    await this.database
      .prepare(
        `DELETE FROM reactions
         WHERE content_id = ? AND user_key = ? AND reaction_type = ?`,
      )
      .bind(contentId, visitorKey, type)
      .run();
    return this.getReactions(contentId, visitorKey);
  }
}

export function d1Storage(database: D1Database): D1ReactionsStorage {
  return new D1ReactionsStorage(database);
}
