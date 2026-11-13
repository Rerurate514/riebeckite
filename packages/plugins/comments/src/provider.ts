import type { CommentsPage } from "./types.js";

export const COMMENTS_CAPABILITIES = ["read", "write"] as const;

export type CommentsCapability = (typeof COMMENTS_CAPABILITIES)[number];

export interface CommentsProvider {
  readonly capabilities: ReadonlySet<CommentsCapability>;
  getComments(contentId: string, limit?: number): Promise<CommentsPage>;
}

export function supportsCommentsCapability(
  provider: CommentsProvider,
  capability: CommentsCapability,
): boolean {
  return provider.capabilities.has(capability);
}

export class MemoryCommentsProvider implements CommentsProvider {
  readonly capabilities: ReadonlySet<CommentsCapability> = new Set(["read"]);
  private store = new Map<string, CommentsPage>();

  constructor(initial: readonly (readonly [string, CommentsPage])[] = []) {
    for (const [contentId, page] of initial) {
      this.store.set(contentId, page);
    }
  }

  async getComments(contentId: string, limit = 20): Promise<CommentsPage> {
    const page = this.store.get(contentId) ?? {
      contentId,
      comments: [],
      total: 0,
    };
    return {
      contentId,
      comments: page.comments.slice(0, limit),
      total: page.total,
    };
  }
}
