export type PostContent = {
  frontmatter: PostFrontmatter;
  html: string;
};

export type PostFrontmatter = Record<string, unknown> & {
  /**
   * Optional source-authored stable content identity. Unlike a slug or URL,
   * this value survives a rename or public-location change.
   */
  id?: string;
  /** @deprecated Use `id`. Read only as a compatibility fallback. */
  uid?: string;
  title?: string;
  description?: string;
  date?: string | Date;
  created?: string | Date;
  published?: string | Date;
  updated?: string | Date;
  publish?: boolean;
  private?: boolean;
  draft?: boolean;
  visibility?: "public" | "unlisted" | "draft";
  publishAt?: string | Date;
  tags?: string[];
  image?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
};
