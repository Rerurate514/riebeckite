import {
  assertWebmentionQuerySupported,
  urlComparisonKey,
  WEBMENTION_CAPABILITIES,
  type WebmentionMention,
  type WebmentionQuery,
  type WebmentionQueryResult,
  type WebmentionType,
} from "@riebeckite/plugin-webmention";
import type { WebmentionStorage } from "../../domain/webmention/storage.js";
import type { D1Database } from "./d1_types.js";

type MentionRow = {
  source: string;
  target: string;
  type: string;
  verified_at: string;
  published_at: string | null;
  title: string | null;
  excerpt: string | null;
  author_name: string | null;
  author_url: string | null;
  author_photo: string | null;
};

const SELECT_COLUMNS = `source, target, type, verified_at, published_at,
  title, excerpt, author_name, author_url, author_photo`;

/**
 * D1-backed Webmention storage. One row per verified `(source, target)` pair;
 * repeated deliveries upsert. Targets are stored in canonical comparison form
 * so trailing-slash and fragment differences converge.
 */
export class D1WebmentionStorage implements WebmentionStorage {
  readonly capabilities = new Set(WEBMENTION_CAPABILITIES);

  constructor(private readonly database: D1Database) {}

  async store(mention: WebmentionMention): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO webmentions (
           source, target, type, verified_at, published_at,
           title, excerpt, author_name, author_url, author_photo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(source, target) DO UPDATE SET
           type = excluded.type,
           verified_at = excluded.verified_at,
           published_at = excluded.published_at,
           title = excluded.title,
           excerpt = excluded.excerpt,
           author_name = excluded.author_name,
           author_url = excluded.author_url,
           author_photo = excluded.author_photo`,
      )
      .bind(
        mention.source,
        urlComparisonKey(mention.target),
        mention.type,
        mention.verifiedAt,
        mention.publishedAt ?? null,
        mention.title ?? null,
        mention.excerpt ?? null,
        mention.author?.name ?? null,
        mention.author?.url ?? null,
        mention.author?.photo ?? null,
      )
      .run();
  }

  async query(query: WebmentionQuery): Promise<WebmentionQueryResult> {
    assertWebmentionQuerySupported(this, query);
    const limit = clampLimit(query.limit);

    if (query.type === "mentions_for_target") {
      const result = await this.database
        .prepare(
          `SELECT ${SELECT_COLUMNS} FROM webmentions
           WHERE target = ?
           ORDER BY COALESCE(published_at, verified_at) DESC, source ASC
           LIMIT ?`,
        )
        .bind(urlComparisonKey(query.target), limit)
        .all<MentionRow>();
      return {
        type: query.type,
        target: query.target,
        mentions: (result.results ?? []).map(toMention),
      };
    }

    if (query.since === undefined) {
      const result = await this.database
        .prepare(
          `SELECT ${SELECT_COLUMNS} FROM webmentions
           ORDER BY COALESCE(published_at, verified_at) DESC, source ASC
           LIMIT ?`,
        )
        .bind(limit)
        .all<MentionRow>();
      return {
        type: query.type,
        mentions: (result.results ?? []).map(toMention),
      };
    }

    const result = await this.database
      .prepare(
        `SELECT ${SELECT_COLUMNS} FROM webmentions
         WHERE verified_at >= ?
         ORDER BY COALESCE(published_at, verified_at) DESC, source ASC
         LIMIT ?`,
      )
      .bind(query.since, limit)
      .all<MentionRow>();
    return {
      type: query.type,
      mentions: (result.results ?? []).map(toMention),
    };
  }
}

/** Creates a D1-backed storage adapter from a Worker binding. */
export function d1Storage(database: D1Database): WebmentionStorage {
  return new D1WebmentionStorage(database);
}

function toMention(row: MentionRow): WebmentionMention {
  const author =
    row.author_name === null &&
    row.author_url === null &&
    row.author_photo === null
      ? undefined
      : {
          ...(row.author_name === null ? {} : { name: row.author_name }),
          ...(row.author_url === null ? {} : { url: row.author_url }),
          ...(row.author_photo === null ? {} : { photo: row.author_photo }),
        };
  return {
    source: row.source,
    target: row.target,
    type: row.type as WebmentionType,
    verifiedAt: row.verified_at,
    ...(row.published_at === null ? {} : { publishedAt: row.published_at }),
    ...(row.title === null ? {} : { title: row.title }),
    ...(row.excerpt === null ? {} : { excerpt: row.excerpt }),
    ...(author === undefined ? {} : { author }),
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return 100;
  return Math.min(Math.max(limit, 1), 1000);
}
