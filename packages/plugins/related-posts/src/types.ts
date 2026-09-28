/** Options accepted by `relatedPosts()`. */
export type RelatedPostsOptions = {
  /** Maximum number of related entries to render. Defaults to `5`. */
  limit?: number;
  /** Minimum score a candidate must reach to be listed. Defaults to `1`. */
  minScore?: number;
  /** Render the `<h2>` heading. Defaults to `true`. */
  heading?: boolean;
  /** Heading text. Defaults to `"Related"`. */
  headingText?: string;
  /** Root CSS class of the generated `<nav>`. Defaults to `"rb-related-posts"`. */
  className?: string;
  /** Use shared tags as a relatedness signal. Defaults to `true`. */
  useTags?: boolean;
  /** Use direct links (outgoing and incoming) as a relatedness signal. Defaults to `true`. */
  useBacklinks?: boolean;
};

/** `RelatedPostsOptions` with every default applied. */
export type ResolvedRelatedPostsOptions = {
  limit: number;
  minScore: number;
  heading: boolean;
  headingText: string;
  className: string;
  useTags: boolean;
  useBacklinks: boolean;
};

/** A single ranked related entry, ready to render. */
export type RelatedPostsEntry = {
  slug: string;
  permalink: string;
  title: string;
  /** Deterministic non-negative score used for ranking and `data-related-score`. */
  score: number;
};
