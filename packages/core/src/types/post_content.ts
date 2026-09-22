export type PostContent = {
  frontmatter: PostFrontmatter;
  html: string;
};

export type PostFrontmatter = Record<string, unknown> & {
  title?: string;
  publish?: boolean;
  private?: boolean;
  draft?: boolean;
  tags?: string[];
};
