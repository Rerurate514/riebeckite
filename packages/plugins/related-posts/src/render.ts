import { renderToString } from "hono/jsx/dom/server";
import RelatedPosts from "../components/related-posts.js";
import type {
  RelatedPostsEntry,
  ResolvedRelatedPostsOptions,
} from "./types.js";

/** Boolean attribute that marks the generated navigation for tests and styling. */
export const RELATED_POSTS_ATTRIBUTE = "data-related-posts";

export function renderRelatedPosts(
  entries: readonly RelatedPostsEntry[],
  options: ResolvedRelatedPostsOptions,
): string {
  return renderToString(RelatedPosts({ entries, options }));
}
