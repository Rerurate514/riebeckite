export type PostContent = {
  frontmatter: PostFrontmatter;
  html: string;
};

export type PostFrontmatter = Record<string, unknown> & {
  title?: string;
  date?: string | Date;
  created?: string | Date;
  publish?: boolean;
  private?: boolean;
  draft?: boolean;
  tags?: string[];
};
