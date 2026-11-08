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

  /**
   * @param userKey Caller-supplied visitor identifier (for example a signed
   *   session cookie value). Must be unique per visitor; do not let clients
   *   choose arbitrary keys. Defaults to a shared "anonymous" key, which
   *   collapses all visitors into one counter.
   */
  constructor(
    private readonly database: D1Database,
    private readonly userKey: string = "anonymous",
  ) {
    if (!userKey || userKey.trim() === "") {
      throw new Error("userKey must be a non-empty string");
    }
  }

  async getReactions(contentId: string): Promise<PageReactions> {
    const countsResult = await this.database
      .prepare(
        `SELECT reaction_type, COUNT(*) AS count FROM reactions
         WHERE content_id = ? GROUP BY reaction_type`,
      )
      .bind(contentId)
      .all<CountRow>();

    const userResult = await this.database
      .prepare(
        `SELECT reaction_type FROM reactions
         WHERE content_id = ? AND user_key = ?`,
      )
      .bind(contentId, this.userKey)
      .all<UserReactionRow>();

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
  ): Promise<PageReactions> {
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO reactions (content_id, user_key, reaction_type)
         VALUES (?, ?, ?)`,
      )
      .bind(contentId, this.userKey, type)
      .run();
    return this.getReactions(contentId);
  }

  async removeReaction(
    contentId: string,
    type: ReactionType,
  ): Promise<PageReactions> {
    await this.database
      .prepare(
        `DELETE FROM reactions
         WHERE content_id = ? AND user_key = ? AND reaction_type = ?`,
      )
      .bind(contentId, this.userKey, type)
      .run();
    return this.getReactions(contentId);
  }
}

export function d1Storage(
  database: D1Database,
  userKey = "anonymous",
): D1ReactionsStorage {
  return new D1ReactionsStorage(database, userKey);
}
