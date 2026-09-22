export type PostContent = {
  frontmatter: PostFrontmatter;
  html: string;
};

export type PostFrontmatter = Record<string, unknown> & {
  title?: string;
  description?: string;
  date?: string | Date;
  created?: string | Date;
  published?: string | Date;
  updated?: string | Date;
  publish?: boolean;
  private?: boolean;
  draft?: boolean;
  tags?: string[];
  image?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
};
