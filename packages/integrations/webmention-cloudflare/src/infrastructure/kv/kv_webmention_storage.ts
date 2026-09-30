import {
  UnsupportedWebmentionQueryError,
  type WebmentionMention,
  type WebmentionQuery,
  type WebmentionQueryResult,
} from "@riebeckite/plugin-webmention";
import type { WebmentionStorage } from "../../domain/webmention/storage.js";

export interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/**
 * Minimal KV storage. KV has no listing or atomic update, so it stores one
 * JSON value per `(target, source)` pair and deliberately does not advertise
 * the `query` capability; feed reads throw `UnsupportedWebmentionQueryError`
 * and the Worker returns `501`. Use D1 when the feed must be served.
 *
 * KV keys are capped at 512 bytes, so very long source/target URLs may fail to
 * store. Prefer D1 for arbitrary URLs.
 */
export class KvWebmentionStorage implements WebmentionStorage {
  readonly capabilities = new Set(["store"] as const);

  constructor(private readonly namespace: KvNamespace) {}

  async store(mention: WebmentionMention): Promise<void> {
    await this.namespace.put(
      keyFor(mention.target, mention.source),
      JSON.stringify(mention),
    );
  }

  async query(query: WebmentionQuery): Promise<WebmentionQueryResult> {
    throw new UnsupportedWebmentionQueryError(query, "query");
  }
}

/** Creates a KV-backed, store-only storage adapter from a binding. */
export function kvStorage(namespace: KvNamespace): WebmentionStorage {
  return new KvWebmentionStorage(namespace);
}

function keyFor(target: string, source: string): string {
  return `webmention:${encodeURIComponent(target)}:${encodeURIComponent(source)}`;
}
