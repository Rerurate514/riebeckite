import type { PageReactions, ReactionType } from "./types.js";

export const REACTIONS_CAPABILITIES = ["read", "write"] as const;

export type ReactionsCapability = (typeof REACTIONS_CAPABILITIES)[number];

export interface ReactionsProvider {
  readonly capabilities: ReadonlySet<ReactionsCapability>;
  getReactions(contentId: string): Promise<PageReactions>;
  addReaction(contentId: string, type: ReactionType): Promise<PageReactions>;
  removeReaction(contentId: string, type: ReactionType): Promise<PageReactions>;
}

export function supportsReactionsCapability(
  provider: ReactionsProvider,
  capability: ReactionsCapability,
): boolean {
  return provider.capabilities.has(capability);
}

export class MemoryReactionsProvider implements ReactionsProvider {
  readonly capabilities: ReadonlySet<ReactionsCapability> = new Set([
    "read",
    "write",
  ]);
  private store = new Map<string, Map<ReactionType, number>>();
  private session = new Set<string>();

  async getReactions(contentId: string): Promise<PageReactions> {
    const counts = this.store.get(contentId) ?? new Map();
    return {
      contentId,
      counts: [...counts.entries()].map(([type, count]) => ({
        type,
        count,
        reacted: this.session.has(this.key(contentId, type)),
      })),
    };
  }

  async addReaction(
    contentId: string,
    type: ReactionType,
  ): Promise<PageReactions> {
    const key = this.key(contentId, type);
    if (this.session.has(key)) return this.getReactions(contentId);
    this.session.add(key);
    const counts = this.store.get(contentId) ?? new Map();
    counts.set(type, (counts.get(type) ?? 0) + 1);
    this.store.set(contentId, counts);
    return this.getReactions(contentId);
  }

  async removeReaction(
    contentId: string,
    type: ReactionType,
  ): Promise<PageReactions> {
    const key = this.key(contentId, type);
    if (!this.session.has(key)) return this.getReactions(contentId);
    this.session.delete(key);
    const counts = this.store.get(contentId);
    if (counts) {
      const next = (counts.get(type) ?? 1) - 1;
      if (next <= 0) counts.delete(type);
      else counts.set(type, next);
    }
    return this.getReactions(contentId);
  }

  private key(contentId: string, type: ReactionType): string {
    return `${contentId}:${type}`;
  }
}
